/** The last accepted hit explains a loss; blocked hits never replace it. */
export const DAMAGE_CAUSES = {
  warden: { happened: "The Warden caught you.", retry: "Break its sightline, shove at close range, or lead it across a trap." },
  harrier: { happened: "The Harrier struck you.", retry: "Face its dive and shove, or bring it down over spikes." },
  keeper: { happened: "The Keeper struck you.", retry: "Keep clear of its reach. Gather the toll, then use a bomb and pass while it kneels." },
  reaper: { happened: "The Reaper reached you.", retry: "Keep moving toward the stairs. A bomb stalls it; shoves pass through it." },
  spikes: { happened: "You stepped onto spikes.", retry: "Watch the floor. You can lead the Warden across spikes while staying clear yourself." },
  pit: { happened: "A pit took your last life.", retry: "Look for cracked floor patches. Once opened, a pit stays dangerous to you and ground creatures." },
  darts: { happened: "A dart volley hit you.", retry: "Leave the plate when it lights up. The same volley can hit a pursuing Warden." },
  bomb: { happened: "Your bomb blast caught you.", retry: "Plant it near the threat, then move clear before the fuse runs out." },
  arena: { happened: "The arena's moving spikes hit you.", retry: "Keep moving between the arms. The inner path needs less speed than the outer wall." },
  memory: { happened: "The memory trial took your last life.", retry: "A failed attempt costs a life. Watch the full sequence before choosing the crystals." },
  idol: { happened: "The idol's trap fired.", retry: "Place a weight on the plate before lifting the idol." },
  unknown: { happened: "You lost your last life.", retry: "" },
} as const;

export type DamageSource = keyof typeof DAMAGE_CAUSES;
