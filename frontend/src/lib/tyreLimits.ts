export const TRACK_TYRE_LIMITS: Record<string, { SOFT: number; MEDIUM: number; HARD: number }> = {
  Bahrain:      { SOFT: 16, MEDIUM: 28, HARD: 41 },
  Jeddah:       { SOFT: 18, MEDIUM: 30, HARD: 44 },
  Melbourne:    { SOFT: 14, MEDIUM: 26, HARD: 38 },
  Suzuka:       { SOFT: 13, MEDIUM: 25, HARD: 37 },
  Shanghai:     { SOFT: 15, MEDIUM: 27, HARD: 39 },
  Miami:        { SOFT: 18, MEDIUM: 29, HARD: 43 },
  Imola:        { SOFT: 14, MEDIUM: 26, HARD: 40 },
  Monaco:       { SOFT: 25, MEDIUM: 41, HARD: 55 }, // Low degradation track
  Barcelona:    { SOFT: 12, MEDIUM: 24, HARD: 36 },
  Montreal:     { SOFT: 17, MEDIUM: 28, HARD: 42 },
  Spielberg:    { SOFT: 18, MEDIUM: 31, HARD: 45 },
  Silverstone:  { SOFT: 11, MEDIUM: 22, HARD: 34 }, // Very abrasive
  Budapest:     { SOFT: 15, MEDIUM: 27, HARD: 41 },
  Spa:          { SOFT: 10, MEDIUM: 20, HARD: 32 }, // EXTREMELY abrasive (your point ✅)
  Zandvoort:    { SOFT: 12, MEDIUM: 23, HARD: 35 },
  Monza:        { SOFT: 18, MEDIUM: 32, HARD: 48 },
  Singapore:    { SOFT: 13, MEDIUM: 25, HARD: 37 },
  Austin:       { SOFT: 14, MEDIUM: 26, HARD: 38 },
  Mexico:       { SOFT: 19, MEDIUM: 30, HARD: 44 },
  Interlagos:   { SOFT: 16, MEDIUM: 27, HARD: 41 },
  LasVegas:     { SOFT: 20, MEDIUM: 35, HARD: 52 }, // Cold track => tyres last longer
  Qatar:        { SOFT: 8,  MEDIUM: 14, HARD: 20 }, // MELTER TRACK
  AbuDhabi:     { SOFT: 17, MEDIUM: 29, HARD: 43 },
};

export const DEFAULT_LIMITS = { SOFT: 18, MEDIUM: 30, HARD: 42 };
