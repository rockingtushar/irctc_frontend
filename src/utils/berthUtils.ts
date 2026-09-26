/**
 * Utility functions for Indian Railways berth codes, layouts, and mappings.
 * Correctly normalizes and detects Side Lower (SL), Side Upper (SU), Lower (L),
 * Middle (M), Upper (U), Side Middle (SM), Cabin (CB), and Coupe (CP).
 */

/**
 * Normalizes any variation of berth codes (e.g., 'sl', 'SL', 'side lower', 'SU', 'Side Upper')
 * and falls back to standard Indian Railways carriage layout by berth number and class if missing.
 */
export function normalizeBerthCode(
  rawCode: string | null | undefined,
  berthNo?: number,
  classCode?: string
): string {
  if (rawCode && typeof rawCode === 'string') {
    const clean = rawCode.trim().toUpperCase();

    // Side Lower matches (including legacy/API codes like 'R' often indicating RAC Side Lower)
    if (
      clean === 'SL' ||
      clean === 'SIDE LOWER' ||
      clean === 'SIDELOWER' ||
      clean === 'SLB' ||
      clean === 'S.L.' ||
      clean === 'S_L' ||
      clean === 'SIDE-LOWER' ||
      clean === 'R' ||
      clean === 'RAC'
    ) {
      return 'SL';
    }

    // Side Upper matches (including legacy/API codes like 'P' indicating Partial/Partition Side Upper)
    if (
      clean === 'SU' ||
      clean === 'SIDE UPPER' ||
      clean === 'SIDEUPPER' ||
      clean === 'SUB' ||
      clean === 'S.U.' ||
      clean === 'S_U' ||
      clean === 'SIDE-UPPER' ||
      clean === 'P'
    ) {
      return 'SU';
    }

    // Side Middle matches (3E economy)
    if (
      clean === 'SM' ||
      clean === 'SIDE MIDDLE' ||
      clean === 'SIDEMIDDLE' ||
      clean === 'SMB' ||
      clean === 'S.M.'
    ) {
      return 'SM';
    }

    // Lower Berth matches
    if (clean === 'L' || clean === 'LB' || clean === 'LOWER' || clean === 'LOWER BERTH') {
      return 'L';
    }

    // Middle Berth matches
    if (clean === 'M' || clean === 'MB' || clean === 'MIDDLE' || clean === 'MIDDLE BERTH') {
      return 'M';
    }

    // Upper Berth matches
    if (clean === 'U' || clean === 'UB' || clean === 'UPPER' || clean === 'UPPER BERTH') {
      return 'U';
    }

    // Cabin / Coupe matches (1A)
    if (clean === 'CB' || clean === 'CABIN') {
      return 'CB';
    }
    if (clean === 'CP' || clean === 'COUPE') {
      return 'CP';
    }

    // Chair Car matches (CC, 2S, EC, EV)
    if (clean === 'WS' || clean === 'WINDOW' || clean === 'WINDOW SEAT') {
      return 'WS';
    }
    if (clean === 'MS' || clean === 'MIDDLE SEAT') {
      return 'MS';
    }
    if (clean === 'AS' || clean === 'AISLE' || clean === 'AISLE SEAT') {
      return 'AS';
    }

    if (clean.length > 0) {
      // If code is something like 'R' or 'P' that didn't match directly, or any single-char aberration
      if (clean === 'R' || clean === 'RAC') return 'SL';
      if (clean === 'P' || clean === 'PARTIAL') {
        // In Sleeper/3A, check if it can be inferred from berth number
        if (typeof berthNo === 'number' && berthNo > 0) {
          const mod8 = berthNo % 8;
          if (mod8 === 7) return 'SL';
          if (mod8 === 0) return 'SU';
        }
        return 'SU';
      }
      return clean;
    }
  }

  // Fallback: Infer standard IRCTC berth code from berth number and coach class
  if (typeof berthNo === 'number' && berthNo > 0) {
    const cls = (classCode || '').trim().toUpperCase();

    // 2A (AC 2-Tier): 6 berths per bay (1-4 inside, 5 SL, 6 SU)
    if (cls === '2A') {
      const mod = berthNo % 6;
      if (mod === 5) return 'SL';
      if (mod === 0) return 'SU';
      if (mod === 1 || mod === 3) return 'L';
      if (mod === 2 || mod === 4) return 'U';
    }

    // 3E (AC 3-Tier Economy): 9 berths per bay (1-6 inside, 7 SL, 8 SM, 9 SU)
    if (cls === '3E') {
      const mod = berthNo % 9;
      if (mod === 7) return 'SL';
      if (mod === 8) return 'SM';
      if (mod === 0) return 'SU';
      if (mod === 1 || mod === 4) return 'L';
      if (mod === 2 || mod === 5) return 'M';
      if (mod === 3 || mod === 6) return 'U';
    }

    // Standard Sleeper (SL), 3A (AC 3-Tier): 8 berths per bay (1-6 inside, 7 SL, 8 SU)
    const mod = berthNo % 8;
    if (mod === 7) return 'SL';
    if (mod === 0) return 'SU';
    if (mod === 1 || mod === 4) return 'L';
    if (mod === 2 || mod === 5) return 'M';
    if (mod === 3 || mod === 6) return 'U';
  }

  return '';
}

/**
 * Returns human-readable label: "Side Lower", "Side Upper", "Lower", "Middle", "Upper", etc.
 */
export function getBerthTypeDisplayName(
  rawCode: string | null | undefined,
  berthNo?: number,
  classCode?: string
): string {
  const code = normalizeBerthCode(rawCode, berthNo, classCode);
  switch (code) {
    case 'SL':
      return 'Side Lower';
    case 'SU':
      return 'Side Upper';
    case 'SM':
      return 'Side Middle';
    case 'L':
      return 'Lower';
    case 'M':
      return 'Middle';
    case 'U':
      return 'Upper';
    case 'CB':
      return 'Cabin';
    case 'CP':
      return 'Coupe';
    case 'WS':
      return 'Window Seat';
    case 'MS':
      return 'Middle Seat';
    case 'AS':
      return 'Aisle Seat';
    default:
      if (code === 'R') return 'Side Lower';
      if (code === 'P') return 'Side Upper';
      return code ? `Berth (${code})` : 'Berth';
  }
}

/**
 * Returns full official label: "Side Lower (SL)", "Side Upper (SU)", etc.
 */
export function getBerthTypeFullName(
  rawCode: string | null | undefined,
  berthNo?: number,
  classCode?: string
): string {
  const code = normalizeBerthCode(rawCode, berthNo, classCode);
  switch (code) {
    case 'SL':
      return 'Side Lower Berth (SL)';
    case 'SU':
      return 'Side Upper Berth (SU)';
    case 'SM':
      return 'Side Middle Berth (SM)';
    case 'L':
      return 'Lower Berth (L)';
    case 'M':
      return 'Middle Berth (M)';
    case 'U':
      return 'Upper Berth (U)';
    case 'CB':
      return 'Cabin Berth (CB)';
    case 'CP':
      return 'Coupe Berth (CP)';
    case 'WS':
      return 'Window Seat (WS)';
    case 'MS':
      return 'Middle Seat (MS)';
    case 'AS':
      return 'Aisle Seat (AS)';
    default:
      if (code === 'R') return 'Side Lower Berth (SL)';
      if (code === 'P') return 'Side Upper Berth (SU)';
      return code ? `Berth (${code})` : 'Berth';
  }
}

/**
 * Checks whether a berth is a Side Berth (Side Lower, Side Upper, Side Middle).
 */
export function isSideBerth(
  rawCode: string | null | undefined,
  berthNo?: number,
  classCode?: string
): boolean {
  const code = normalizeBerthCode(rawCode, berthNo, classCode);
  return code === 'SL' || code === 'SU' || code === 'SM';
}
