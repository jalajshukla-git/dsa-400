export const QUOTES = [
  'Success is the sum of small efforts repeated day in and day out.',
  'We are what we repeatedly do. Excellence, then, is not an act but a habit.',
  'It does not matter how slowly you go as long as you do not stop.',
  'Discipline is choosing between what you want now and what you want most.',
  'The chains of habit are too weak to be felt until they are too strong to be broken.',
  'Motivation gets you going. Habit keeps you growing.',
  'You don’t have to be extreme — just consistent.',
  'Small daily improvements over time lead to stunning results.',
  'Don’t break the chain — every box you fill is a promise kept.',
  'The secret of getting ahead is getting started.',
  'A river cuts through rock not because of its power but its persistence.',
  'Consistency is the true foundation of trust. Either keep your promises or don’t make them.',
  'Goals set a direction; systems make the progress.',
  'Every day you either feed the good habit or fight it. Feed the good one.',
  'You will never change your life until you change something you do daily.',
  'Perseverance is not one long race — it is many short races one after another.',
  'Discipline is the bridge between goals and accomplishment.',
  'Talent is common. The willingness to show up every day is rare.',
  'Champions are made in the dark of repetition no one applauds.',
  'Fall in love with the process and the results will come.',
  'Do the hard work now — the future you is watching.',
  'Consistency compounds: 1% better every day is 37× better in a year.',
  'A goal without a plan is a wish. A plan without daily action is a daydream.',
  'You are one rep, one problem, one day away from a different life.',
];
export const pickQuote = n => {
  const i = n == null ? Math.floor(Math.random() * QUOTES.length) : Math.abs(n) % QUOTES.length;
  return QUOTES[i];
};
