/**
 * English Name Pool for generating readable email addresses
 * Contains common English first names and last names
 */

export const NAME_POOL = {
  // At least 100 common English first names
  firstNames: [
    // Male names
    'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph',
    'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'mark',
    'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian',
    'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan',
    'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin',
    'scott', 'brandon', 'benjamin', 'samuel', 'raymond', 'gregory', 'frank',
    'alexander', 'patrick', 'jack', 'dennis', 'jerry',
    // Female names
    'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan',
    'jessica', 'sarah', 'karen', 'lisa', 'nancy', 'betty', 'margaret', 'sandra',
    'ashley', 'kimberly', 'emily', 'donna', 'michelle', 'dorothy', 'carol',
    'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura',
    'cynthia', 'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda',
    'pamela', 'emma', 'nicole', 'helen', 'samantha', 'katherine', 'christine',
    'debra', 'rachel', 'carolyn', 'janet', 'catherine', 'maria', 'heather',
    // Gender-neutral / Additional names
    'alex', 'taylor', 'jordan', 'morgan', 'casey', 'riley', 'jamie', 'avery',
    'quinn', 'parker', 'blake', 'drew', 'cameron', 'logan', 'dylan', 'hayden',
    'peyton', 'reese', 'sage', 'skyler', 'charlie', 'finley', 'harper', 'kendall',
    'madison', 'mason', 'noah', 'oliver', 'sophia', 'liam', 'ethan', 'lucas',
    'mia', 'ella', 'grace', 'chloe', 'lily', 'zoe', 'hannah', 'natalie',
    'victoria', 'claire', 'audrey', 'leah', 'savannah', 'brooklyn', 'violet'
  ],

  // At least 50 common English last names
  lastNames: [
    'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller',
    'davis', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez',
    'wilson', 'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin',
    'lee', 'perez', 'thompson', 'white', 'harris', 'sanchez', 'clark',
    'ramirez', 'lewis', 'robinson', 'walker', 'young', 'allen', 'king',
    'wright', 'scott', 'torres', 'nguyen', 'hill', 'flores', 'green',
    'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell', 'mitchell',
    'carter', 'roberts', 'turner', 'phillips', 'evans', 'parker', 'edwards',
    'collins', 'stewart', 'morris', 'murphy', 'cook', 'rogers', 'morgan',
    'peterson', 'cooper', 'reed', 'bailey', 'bell', 'gomez', 'kelly'
  ]
} as const;

export type FirstName = typeof NAME_POOL.firstNames[number];
export type LastName = typeof NAME_POOL.lastNames[number];
