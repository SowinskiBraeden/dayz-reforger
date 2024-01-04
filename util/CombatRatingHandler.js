module.exports = {
  calculateNewCombatRating: (Ra, Rb, score) => {
    const Ea = 1 / (1 + Math.pow(10, ((Rb - Ra) / 400)));
    return Math.round(Ra + 32 * (score - Ea));
  },
}