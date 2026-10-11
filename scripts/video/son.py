"""Bande-son de la vidéo : musique et bruitages synthétisés (aucun son téléchargé, aucun droit à gérer).

python3 scripts/video/son.py <sortie.wav>

Musique à 120 BPM (une mesure = 2 s, chaque scène dure deux mesures), grille fa – do – ré m – si♭ :
marimba en arpèges, nappe douce, basse ; les percussions entrent avec le titre (4 s).
Les bruitages suivent la chronologie de promo.html.
"""
import sys
import wave

import numpy as np

SR = 48000
DUREE = 30.0
N = int(SR * DUREE)
rng = np.random.default_rng(7)
gauche = np.zeros(N)
droite = np.zeros(N)


def temps(d):
    return np.arange(int(SR * d)) / SR


def poser(son, t0, gain=1.0, pan=0.0):
    """Ajoute un son mono à l'instant t0 (s), panoramique de -1 (gauche) à 1 (droite)."""
    i = int(t0 * SR)
    if i >= N:
        return
    son = son[: N - i] * gain
    # Fondu de 5 ms en fin de son : un son coupé net claque.
    k = min(len(son), int(0.005 * SR))
    son[len(son) - k :] *= np.linspace(1, 0, k)
    gauche[i : i + len(son)] += son * np.sqrt((1 - pan) / 2) * 1.414
    droite[i : i + len(son)] += son * np.sqrt((1 + pan) / 2) * 1.414


def passe_bas(x, a):
    """Filtre passe-bas à un pôle ; a entre 0 (fermé) et 1 (ouvert), constant ou un tableau."""
    y = np.empty_like(x)
    acc = 0.0
    coef = np.broadcast_to(a, x.shape)
    for i in range(len(x)):
        acc += coef[i] * (x[i] - acc)
        y[i] = acc
    return y


def note(n):
    """Fréquence d'une note MIDI."""
    return 440.0 * 2 ** ((n - 69) / 12)


# ---------------- Instruments ----------------

def marimba(f, d=0.9, v=1.0):
    t = temps(d)
    attaque = np.minimum(1, t / 0.003)
    corps = np.sin(2 * np.pi * f * t) * np.exp(-t * 4.5)
    harmo = 0.35 * np.sin(2 * np.pi * f * 3.99 * t) * np.exp(-t * 18)
    eclat = 0.12 * np.sin(2 * np.pi * f * 9.9 * t) * np.exp(-t * 45)
    return v * attaque * (corps + harmo + eclat)


def nappe(fs, d):
    t = temps(d)
    env = np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.6)
    s = np.zeros_like(t)
    for f in fs:
        for desaccord in (-0.0025, 0.0025):
            for h, a in ((1, 1), (2, 0.35), (3, 0.15)):
                s += a * np.sin(2 * np.pi * f * h * (1 + desaccord) * t + rng.random() * 6)
    return env * s / (len(fs) * 3)


def basse(f, d=0.45):
    t = temps(d)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 5)
    return env * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t))


def grosse_caisse():
    t = temps(0.35)
    freq = 48 + 80 * np.exp(-t * 32)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(phase) * np.exp(-t * 8) + 0.3 * np.exp(-t * 400) * rng.uniform(-1, 1, len(t))


def claquement():
    t = temps(0.22)
    bruit = rng.uniform(-1, 1, len(t))
    # Bande médium (≈ 1–4 kHz) : un claquement mat, pas un souffle.
    filtre = passe_bas(bruit - passe_bas(bruit, 0.12), 0.32)
    env = np.zeros_like(t)
    for decal in (0, 0.009, 0.018):
        env += (t >= decal) * np.exp(-np.maximum(0, t - decal) * 60)
    env += 0.4 * np.exp(-t * 14)
    return filtre * env * 1.1


def hochet(v=1.0):
    t = temps(0.06)
    bruit = rng.uniform(-1, 1, len(t))
    aigu = passe_bas(bruit - passe_bas(bruit, 0.45), 0.6)
    return v * aigu * np.minimum(1, t / 0.006) * np.exp(-t * 70) * 0.5


# ---------------- Bruitages ----------------

def souffle(d=0.55, monte=True, v=1.0):
    """Whoosh : bruit dont le filtre s'ouvre puis se referme."""
    t = temps(d)
    x = t / d
    cloche = np.sin(np.pi * x) ** 2
    ouverture = 0.015 + 0.22 * (x if monte else 1 - x) * cloche + 0.04 * cloche
    bruit = rng.uniform(-1, 1, len(t))
    return v * passe_bas(bruit, ouverture) * cloche * 2.2


def pop(f=700, v=1.0):
    t = temps(0.12)
    freq = f * (0.45 + 0.55 * np.exp(-t * 40))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return v * np.sin(phase) * np.exp(-t * 32) * np.minimum(1, t / 0.002)


def plouf(v=1.0):
    t = temps(0.2)
    freq = 160 + 420 * np.exp(-t * 25)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return v * (np.sin(phase) * np.exp(-t * 16) + 0.15 * rng.uniform(-1, 1, len(t)) * np.exp(-t * 80))


def bulle(f=380, v=1.0):
    t = temps(0.07)
    freq = f * (1 + 2.2 * t / 0.07)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return v * np.sin(phase) * np.sin(np.pi * t / 0.07) ** 2


def tic(f=2400, v=1.0):
    t = temps(0.018)
    return v * np.sin(2 * np.pi * f * t) * np.exp(-t * 260)


def clic(v=1.0):
    t = temps(0.04)
    return v * (0.6 * np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 180) + 0.4 * rng.uniform(-1, 1, len(t)) * np.exp(-t * 400))


def cloche(f=1318.5, d=1.6, v=1.0):
    t = temps(d)
    s = np.zeros_like(t)
    for rapport, a, amort in ((1, 1, 3), (2.76, 0.45, 6), (5.4, 0.22, 10), (8.93, 0.1, 16)):
        s += a * np.sin(2 * np.pi * f * rapport * t) * np.exp(-t * amort)
    return v * s * np.minimum(1, t / 0.002) * 0.6


def page(v=1.0):
    t = temps(0.22)
    bruit = rng.uniform(-1, 1, len(t))
    env = np.sin(np.pi * np.minimum(1, t / 0.22)) ** 1.5
    return v * (bruit - passe_bas(bruit, 0.12)) * env * 0.45 + v * 0.3 * np.sin(2 * np.pi * 90 * t) * np.exp(-t * 30)


def glissade(f0=320, f1=980, d=0.9, v=1.0):
    t = temps(d)
    freq = f0 + (f1 - f0) * (t / d) ** 1.4
    phase = 2 * np.pi * np.cumsum(freq) / SR
    env = np.minimum(1, t / 0.08) * np.minimum(1, (d - t) / 0.2)
    return v * (np.sin(phase) + 0.3 * np.sin(2 * phase)) * env * 0.35


# ---------------- Musique ----------------
TEMPS = 0.5  # une noire à 120 BPM
GRILLE = [  # (fondamentale de la basse, notes de l'accord)
    (41, [65, 69, 72]),  # fa
    (36, [60, 64, 67]),  # do
    (38, [62, 65, 69]),  # ré mineur
    (34, [58, 62, 65]),  # si bémol
]
MELODIE = {  # mesure : [(temps dans la mesure, note MIDI, durée)]
    2: [(0, 81, 0.5), (1, 84, 0.5), (2, 81, 0.5), (3, 79, 0.5)],
    3: [(0, 79, 0.5), (1.5, 76, 0.5), (2, 79, 1)],
    4: [(0, 77, 0.5), (1, 81, 0.5), (2, 84, 0.5), (3, 86, 0.5)],
    5: [(0, 82, 1), (2, 81, 0.5), (3, 77, 0.5)],
    8: [(0, 81, 0.5), (1, 84, 0.5), (2, 86, 0.5), (3, 84, 0.5)],
    9: [(0, 79, 1), (2, 76, 0.5), (3, 79, 0.5)],
    10: [(0, 77, 0.5), (1, 81, 0.5), (2, 84, 0.5), (3, 89, 0.5)],
    11: [(0, 86, 1), (2, 84, 0.5), (3, 82, 0.5)],
    13: [(0, 84, 0.5), (1, 81, 0.5), (2, 79, 0.5), (3, 77, 1)],
}

for mesure in range(15):
    debut = mesure * 2.0
    fond, accord = GRILLE[mesure % 4]
    finale = mesure == 14
    if finale:
        fond, accord = GRILLE[0]
    # Nappe : chaleur continue, plus discrète une fois les percussions entrées.
    poser(nappe([note(n - 12) for n in accord], 2.2 if not finale else 2.0), debut, 0.10 if mesure >= 2 else 0.16)
    # Arpège de marimba en croches : montée puis descente.
    motif = [accord[0], accord[1], accord[2], accord[1] + 12, accord[2], accord[1], accord[0] + 12, accord[2]]
    if finale:
        for i, n in enumerate([accord[0], accord[1], accord[2], accord[0] + 12, accord[1] + 12]):
            poser(marimba(note(n), 2.0, 0.55), debut + i * 0.07, 0.5, pan=-0.3 + i * 0.15)
    else:
        for i, n in enumerate(motif):
            poser(marimba(note(n), 0.8, 0.5 if i % 2 == 0 else 0.38), debut + i * TEMPS / 2, 0.42, pan=-0.25 + (i % 4) * 0.15)
    for tps, n, d in MELODIE.get(mesure, []):
        poser(marimba(note(n), d + 0.6, 0.8), debut + tps * TEMPS, 0.34, pan=0.2)
    # Basse et percussions à partir du titre (4 s).
    if mesure >= 2 and not finale:
        for tps, n in ((0, fond), (1.5, fond), (2, fond + 7), (3.5, fond)):
            poser(basse(note(n + 12)), debut + tps * TEMPS, 0.42)
        for tps in (0, 2):
            poser(grosse_caisse(), debut + tps * TEMPS, 0.55)
        for tps in (1, 3):
            poser(claquement(), debut + tps * TEMPS, 0.32, pan=0.1)
    if mesure >= 1 and not finale:
        for croche in range(8):
            poser(hochet(1.0 if croche % 2 else 0.55), debut + croche * TEMPS / 2, 0.16, pan=0.45)
    if finale:
        poser(grosse_caisse(), debut, 0.5)
        poser(basse(note(fond + 12), 1.6), debut, 0.4)

# Fondu de la musique sur la dernière seconde et demie.
fondu = np.ones(N)
fondu[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR)) ** 2
gauche *= fondu
droite *= fondu

# ---------------- Bruitages, calés sur promo.html ----------------
B = 1.0
poser(pop(420), 0.88, 0.35 * B)  # la pile de pages arrive
for i, t in enumerate((1.55, 2.05, 2.55)):
    poser(page(), t, 0.6 * B, pan=-0.2 + i * 0.2)  # les saisons passées se tournent
poser(souffle(0.6), 3.4, 0.5 * B)  # sortie de l'accroche
poser(souffle(0.8), 3.45, 0.3 * B)  # la feuille monte au centre
for i, t in enumerate((4.77, 5.02, 5.27)):
    poser(plouf(), t, 0.55 * B, pan=-0.3 + i * 0.3)  # les produits tombent dans le bol
for i, n in enumerate((84, 88, 91, 96, 100)):
    poser(cloche(note(n), 1.0), 5.3 + i * 0.12, 0.10 * B, pan=-0.4 + i * 0.2)  # le titre s'écrit
poser(souffle(0.6), 7.5, 0.5 * B)
poser(glissade(300, 900, 0.9), 8.35, 0.45 * B)  # les barres du calendrier montent
for i in range(14):
    poser(tic(2600), 9.0 + i * 0.065, 0.12 * B, pan=0.3)  # le compteur défile
for i in range(12):
    poser(pop(560 + i * 35), 9.4 + i * 0.06, 0.32 * B, pan=-0.5 + (i % 4) * 0.33)  # les produits apparaissent
poser(souffle(0.55, monte=False), 11.5, 0.55 * B, pan=-0.4)  # glissement vers la gauche
poser(cloche(1318.5, 1.4), 12.02, 0.32 * B)  # « Nouveau »
for i in range(9):
    for k in range(3):
        poser(bulle(300 + rng.random() * 300), 12.45 + i * 0.09 + k * 0.05, 0.18 * B, pan=0.6 - i * 0.12)  # le banc arrive
poser(souffle(0.6), 13.55, 0.35 * B)  # le téléphone monte
poser(souffle(0.55), 15.5, 0.5 * B)
poser(cloche(1318.5, 1.4), 16.02, 0.32 * B)  # « Nouveau »
poser(souffle(0.7), 16.4, 0.4 * B)  # le téléphone arrive
for t in (17.55, 18.15, 18.75):
    poser(clic(), t, 0.55 * B)  # cases cochées
poser(clic(), 19.55, 0.6 * B)  # « Ajouter ces 3 repas »
poser(souffle(0.45), 19.7, 0.35 * B)
poser(cloche(1318.5, 1.2), 20.3, 0.28 * B)  # succès : deux notes qui montent
poser(cloche(1760.0, 1.4), 20.42, 0.26 * B)
poser(souffle(0.55), 21.55, 0.5 * B)
for i in range(4):
    poser(pop(500 + i * 80), 22.35 + i * 0.09, 0.4 * B, pan=-0.3 + i * 0.2)  # bilan de la semaine
poser(glissade(400, 1100, 0.85), 23.45, 0.35 * B)  # 0 → 41
for i in range(20):
    poser(pop(520 + (i % 5) * 60 + rng.random() * 40), 23.6 + (i % 5) * 0.05 + (i // 5) * 0.12 + 0.38, 0.22 * B, pan=-0.6 + (i % 5) * 0.3)  # la pluie de produits
poser(souffle(0.6), 25.5, 0.5 * B)
for i, n in enumerate((77, 81, 84, 89)):
    poser(cloche(note(n + 12), 2.4), 26.0 + i * 0.07, 0.2 * B, pan=-0.3 + i * 0.2)  # le logo
poser(pop(380), 26.05, 0.5 * B)

# ---------------- Mixage ----------------
stereo = np.stack([gauche, droite], axis=1)
stereo /= np.max(np.abs(stereo)) / 0.95
stereo = np.tanh(stereo * 1.3) / np.tanh(1.3) * 0.89  # légère saturation douce, crête à -1 dB
donnees = (stereo * 32767).astype("<i2")
with wave.open(sys.argv[1], "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(donnees.tobytes())
print(f"{sys.argv[1]} : {DUREE:.0f} s, {SR} Hz, stéréo")
