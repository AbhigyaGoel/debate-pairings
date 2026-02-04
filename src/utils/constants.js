export const EXPERIENCE_LEVELS = ["Competitive", "General"];

export const IRON_SCENARIOS = {
  FULL_ROUND_3_TEAMS: 7,
  FULL_ROUND_2_TEAMS: 5,
  HALF_ROUND_1_TEAM: 3,
};

export const MAX_SPECTATOR_PROPAGATION_ITERATIONS = 10;

export const POSITION_NAMES = {
  OG: "Opening Government",
  OO: "Opening Opposition",
  CG: "Closing Government",
  CO: "Closing Opposition",
};

export const ROUND_TYPES = {
  full: {
    label: "Full Round",
    positions: ["OG", "OO", "CG", "CO"],
    teamsPerChamber: 4,
  },
  opening: {
    label: "Opening Half Only",
    positions: ["OG", "OO"],
    teamsPerChamber: 2,
  },
  closing: {
    label: "Closing Half Only",
    positions: ["CG", "CO"],
    teamsPerChamber: 2,
  },
};
