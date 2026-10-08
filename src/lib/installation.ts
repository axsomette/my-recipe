// Installation sur l'écran d'accueil : invite native (Android, Chrome) ou consignes (iPhone, iPad).
import { useEffect, useState } from 'preact/hooks';

interface InviteInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let invite: InviteInstallation | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

/** À appeler au démarrage : l'invite d'installation peut arriver avant l'ouverture des réglages. */
export function suivreInstallation() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invite = e as InviteInstallation;
    prevenir();
  });
  window.addEventListener('appinstalled', () => {
    invite = null;
    prevenir();
  });
}

const estInstallee = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile.
const estIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

export function useInstallation() {
  const [, rafraichir] = useState(0);
  useEffect(() => {
    const suivre = () => rafraichir((n) => n + 1);
    abonnes.add(suivre);
    return () => {
      abonnes.delete(suivre);
    };
  }, []);
  return {
    installee: estInstallee(),
    ios: estIos(),
    peutProposer: invite !== null,
    proposer: async () => {
      if (!invite) return;
      await invite.prompt();
      await invite.userChoice;
      invite = null;
      prevenir();
    },
  };
}
