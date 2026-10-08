// Données de l'utilisateur partagées par toute l'app, enregistrées à chaque modification.
import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useRef, useState } from 'preact/hooks';
import { charger, sauvegarder, type ResultatChargement } from './stockage';
import type { Donnees } from './types';

interface ContexteDonnees {
  donnees: Donnees;
  /** État au démarrage : permet d'avertir si le stockage est indisponible ou illisible. */
  chargement: ResultatChargement['etat'];
  /** Faux si la dernière sauvegarde a échoué (stockage plein ou bloqué). */
  sauvegardeOk: boolean;
  modifier: (changer: (actuelles: Donnees) => Donnees) => void;
}

const Contexte = createContext<ContexteDonnees | null>(null);

export function FournisseurDonnees({ children }: { children: ComponentChildren }) {
  const [initial] = useState(charger);
  const [donnees, setDonnees] = useState(initial.donnees);
  const [sauvegardeOk, setSauvegardeOk] = useState(true);
  const courantes = useRef(donnees);

  const modifier = useCallback((changer: (actuelles: Donnees) => Donnees) => {
    const suivantes = changer(courantes.current);
    courantes.current = suivantes;
    setDonnees(suivantes);
    setSauvegardeOk(sauvegarder(suivantes));
  }, []);

  return (
    <Contexte.Provider value={{ donnees, chargement: initial.etat, sauvegardeOk, modifier }}>{children}</Contexte.Provider>
  );
}

export function useDonnees(): ContexteDonnees {
  const contexte = useContext(Contexte);
  if (!contexte) throw new Error('useDonnees doit être utilisé dans <FournisseurDonnees>');
  return contexte;
}
