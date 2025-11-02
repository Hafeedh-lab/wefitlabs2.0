/**
 * ELO Rating System for WeFit Labs
 * Implements modified ELO rating for both singles and doubles pickleball matches
 */

interface Player {
  id: string;
  rating: number;
}

interface Team {
  player1: Player;
  player2?: Player; // Optional for singles
}

interface MatchResult {
  team1: Team;
  team2: Team;
  winner: 'team1' | 'team2';
  score: {
    team1: number;
    team2: number;
  };
}

interface RatingUpdate {
  team1: {
    player1: { newRating: number; change: number };
    player2?: { newRating: number; change: number };
  };
  team2: {
    player1: { newRating: number; change: number };
    player2?: { newRating: number; change: number };
  };
  metadata: {
    expectedWinProbability: number;
    scoreDifferentialBonus: number;
    upsetBonus: number;
    isUpset: boolean;
  };
}

export class EloSystem {
  // Configuration constants
  private readonly K_FACTOR = 32; // Sensitivity to results
  private readonly INITIAL_RATING = 1200;
  private readonly MIN_RATING_CHANGE = 10;
  private readonly MAX_RATING_CHANGE = 50;
  private readonly SCORE_DIFFERENTIAL_MULTIPLIER = 1.5;
  private readonly UPSET_BONUS_THRESHOLD = 200; // Rating difference for upset

  /**
   * Calculate new ratings for all players after a match
   */
  calculateNewRatings(match: MatchResult): RatingUpdate {
    // Calculate team average ratings
    const team1Rating = this.getTeamRating(match.team1);
    const team2Rating = this.getTeamRating(match.team2);

    // Calculate expected win probability using ELO formula
    const expectedWinProbability = this.getExpectedWinProbability(team1Rating, team2Rating);

    // Determine actual result (1 for team1 win, 0 for team2 win)
    const actualResult = match.winner === 'team1' ? 1 : 0;

    // Calculate score differential bonus
    const scoreDifferentialBonus = this.getScoreDifferentialBonus(
      match.score.team1,
      match.score.team2
    );

    // Check for upset
    const ratingDifference = Math.abs(team1Rating - team2Rating);
    const isUpset =
      ratingDifference >= this.UPSET_BONUS_THRESHOLD &&
      ((match.winner === 'team1' && team1Rating < team2Rating) ||
        (match.winner === 'team2' && team2Rating < team1Rating));

    const upsetBonus = isUpset ? 1.5 : 1;

    // Calculate base rating change
    const baseChange =
      this.K_FACTOR *
      (actualResult - expectedWinProbability) *
      scoreDifferentialBonus *
      upsetBonus;

    // Ensure minimum and maximum rating changes
    const ratingChange = this.clampRatingChange(Math.abs(baseChange));

    // Apply rating changes to all players
    return this.applyRatingChanges(match, ratingChange, {
      expectedWinProbability,
      scoreDifferentialBonus,
      upsetBonus,
      isUpset,
    });
  }

  /**
   * Get team average rating (handles both singles and doubles)
   */
  private getTeamRating(team: Team): number {
    if (team.player2) {
      // Doubles: average of both players
      return (team.player1.rating + team.player2.rating) / 2;
    }
    // Singles: just the player's rating
    return team.player1.rating;
  }

  /**
   * Calculate expected win probability using ELO formula
   */
  private getExpectedWinProbability(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Calculate score differential bonus
   * Closer games result in standard changes, blowouts result in larger changes
   */
  private getScoreDifferentialBonus(scoreA: number, scoreB: number): number {
    const differential = Math.abs(scoreA - scoreB);

    if (differential >= 8) {
      // Dominant win (11-3 or worse)
      return this.SCORE_DIFFERENTIAL_MULTIPLIER;
    } else if (differential <= 2) {
      // Very close game (11-9, 11-10)
      return 1.2;
    }
    // Normal game
    return 1.0;
  }

  /**
   * Clamp rating change to min/max bounds
   */
  private clampRatingChange(change: number): number {
    return Math.max(this.MIN_RATING_CHANGE, Math.min(this.MAX_RATING_CHANGE, change));
  }

  /**
   * Apply rating changes to all players in the match
   */
  private applyRatingChanges(
    match: MatchResult,
    ratingChange: number,
    metadata: {
      expectedWinProbability: number;
      scoreDifferentialBonus: number;
      upsetBonus: number;
      isUpset: boolean;
    }
  ): RatingUpdate {
    const team1Won = match.winner === 'team1';

    // Team 1 players
    const team1Change = team1Won ? ratingChange : -ratingChange;
    const team1Player1NewRating = Math.round(match.team1.player1.rating + team1Change);
    const team1Player2NewRating = match.team1.player2
      ? Math.round(match.team1.player2.rating + team1Change)
      : undefined;

    // Team 2 players
    const team2Change = team1Won ? -ratingChange : ratingChange;
    const team2Player1NewRating = Math.round(match.team2.player1.rating + team2Change);
    const team2Player2NewRating = match.team2.player2
      ? Math.round(match.team2.player2.rating + team2Change)
      : undefined;

    return {
      team1: {
        player1: {
          newRating: team1Player1NewRating,
          change: Math.round(team1Change),
        },
        player2: match.team1.player2
          ? {
              newRating: team1Player2NewRating!,
              change: Math.round(team1Change),
            }
          : undefined,
      },
      team2: {
        player1: {
          newRating: team2Player1NewRating,
          change: Math.round(team2Change),
        },
        player2: match.team2.player2
          ? {
              newRating: team2Player2NewRating!,
              change: Math.round(team2Change),
            }
          : undefined,
      },
      metadata: {
        ...metadata,
        upsetBonus: metadata.upsetBonus,
      },
    };
  }

  /**
   * Get skill bracket label based on rating
   */
  getSkillBracket(rating: number): {
    label: string;
    color: string;
    min: number;
    max: number;
  } {
    if (rating < 1000) {
      return { label: 'Beginner', color: '#9CA3AF', min: 0, max: 999 }; // Gray
    } else if (rating < 1200) {
      return { label: 'Recreational', color: '#10B981', min: 1000, max: 1199 }; // Green
    } else if (rating < 1400) {
      return { label: 'Intermediate', color: '#3B82F6', min: 1200, max: 1399 }; // Blue
    } else if (rating < 1600) {
      return { label: 'Advanced', color: '#8B5CF6', min: 1400, max: 1599 }; // Purple
    } else if (rating < 1800) {
      return { label: 'Expert', color: '#F59E0B', min: 1600, max: 1799 }; // Orange
    } else {
      return { label: 'Elite', color: '#EF4444', min: 1800, max: 9999 }; // Red
    }
  }

  /**
   * Calculate win probability between two players/teams
   */
  getWinProbability(ratingA: number, ratingB: number): {
    playerA: number;
    playerB: number;
  } {
    const probA = this.getExpectedWinProbability(ratingA, ratingB);
    return {
      playerA: Math.round(probA * 100),
      playerB: Math.round((1 - probA) * 100),
    };
  }

  /**
   * Get initial rating for new players
   */
  getInitialRating(): number {
    return this.INITIAL_RATING;
  }

  /**
   * Calculate performance rating for a match
   * Higher than actual rating = played above level
   */
  getPerformanceRating(playerRating: number, opponentRating: number, won: boolean): number {
    const expectedProb = this.getExpectedWinProbability(playerRating, opponentRating);
    const actualResult = won ? 1 : 0;
    const performance = opponentRating + 400 * Math.log10(actualResult / (1 - actualResult));

    // If the calculation results in invalid performance (e.g., perfect win/loss)
    if (!isFinite(performance)) {
      return won ? opponentRating + 200 : opponentRating - 200;
    }

    return Math.round(performance);
  }

  /**
   * Calculate rating volatility (consistency)
   * Lower volatility = more consistent performance
   */
  calculateVolatility(recentRatings: number[]): {
    volatility: number;
    trend: 'improving' | 'declining' | 'stable';
  } {
    if (recentRatings.length < 5) {
      return { volatility: 0, trend: 'stable' };
    }

    // Calculate standard deviation
    const mean = recentRatings.reduce((a, b) => a + b) / recentRatings.length;
    const variance =
      recentRatings.reduce((sum, rating) => sum + Math.pow(rating - mean, 2), 0) /
      recentRatings.length;
    const volatility = Math.sqrt(variance);

    // Calculate trend
    const firstHalf = recentRatings.slice(0, Math.floor(recentRatings.length / 2));
    const secondHalf = recentRatings.slice(Math.floor(recentRatings.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (secondAvg > firstAvg + 20) {
      trend = 'improving';
    } else if (secondAvg < firstAvg - 20) {
      trend = 'declining';
    }

    return { volatility: Math.round(volatility), trend };
  }
}

// Export singleton instance
export const eloSystem = new EloSystem();

// Export types
export type { MatchResult, RatingUpdate, Player, Team };
