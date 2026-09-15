export interface EnrichedEpisodeData {
  title: string;
  runtime: number;
  description?: string;
}

export interface EnrichedSeasonData {
  seasonNumber: number;
  title?: string;
  description?: string;
  episodes: Record<number, EnrichedEpisodeData>;
}

export const EPISODE_METADATA_REGISTRY: Record<string, Record<number, EnrichedSeasonData>> = {
  // Stranger Things (subjectId: '3330020475752907416')
  '3330020475752907416': {
    1: {
      seasonNumber: 1,
      title: 'Season 1',
      description: 'The disappearance of Will Byers and discovery of Eleven.',
      episodes: {
        1: { title: 'Chapter One: The Vanishing of Will Byers', runtime: 48, description: 'On his way home from a friend\'s house, young Will sees something terrifying.' },
        2: { title: 'Chapter Two: The Weirdo on Maple Street', runtime: 55, description: 'Lucas, Mike and Dustin try to talk to the girl they found in the woods.' },
        3: { title: 'Chapter Three: Holly, Jolly', runtime: 51, description: 'Nancy looks for Barb and finds out what Jonathan has been up to.' },
        4: { title: 'Chapter Four: The Body', runtime: 50, description: 'Refusing to believe Will is dead, Joyce tries to connect with her son.' },
        5: { title: 'Chapter Five: The Flea and the Acrobat', runtime: 52, description: 'Hopper breaks into the laboratory while the boys ask how to travel to another dimension.' },
        6: { title: 'Chapter Six: The Monster', runtime: 46, description: 'Jonathan looks for Nancy in the darkness, but Steve has his own questions.' },
        7: { title: 'Chapter Seven: The Bathtub', runtime: 42, description: 'Eleven uses her powers to reach Will while government agents close in on the boys.' },
        8: { title: 'Chapter Eight: The Upside Down', runtime: 55, description: 'Jim Hopper and Joyce enter the Upside Down to rescue Will in a desperate showdown.' },
      },
    },
    2: {
      seasonNumber: 2,
      title: 'Season 2',
      description: 'The Shadow Monster emerges over Hawkins.',
      episodes: {
        1: { title: 'Chapter One: MADMAX', runtime: 48, description: 'As Halloween nears, a new player arrives in Hawkins.' },
        2: { title: 'Chapter Two: Trick or Treat, Freak', runtime: 56, description: 'Will sees something monstrous on Halloween night.' },
        3: { title: 'Chapter Three: The Pollywog', runtime: 51, description: 'Dustin adopts an unusual creature from the trash.' },
        4: { title: 'Chapter Four: Will the Wise', runtime: 46, description: 'Joyce seeks answers to Will\'s mysterious drawings.' },
        5: { title: 'Chapter Five: Dig Dug', runtime: 58, description: 'Hopper uncovers an intricate network under the pumpkin patch.' },
        6: { title: 'Chapter Six: The Spy', runtime: 51, description: 'The monster connects to Will, leading to an ambush at the lab.' },
        7: { title: 'Chapter Seven: The Lost Sister', runtime: 45, description: 'Eleven travels to Chicago to find Kali, another numbered child.' },
        8: { title: 'Chapter Eight: The Mind Flayer', runtime: 47, description: 'Survivors trap themselves inside Hawkins Lab with bloodthirsty demo-dogs.' },
        9: { title: 'Chapter Nine: The Gate', runtime: 62, description: 'Eleven returns to close the gate once and for all.' },
      },
    },
    3: {
      seasonNumber: 3,
      title: 'Season 3',
      description: 'Summer of 1985 at the Starcourt Mall.',
      episodes: {
        1: { title: 'Chapter One: Suzie, Do You Copy?', runtime: 50, description: 'Summer brings romance, mall adventures, and secret Russian radio broadcasts.' },
        2: { title: 'Chapter Two: The Mall Rats', runtime: 50, description: 'Billy exhibits disturbing behavior after a car crash.' },
        3: { title: 'Chapter Three: The Case of the Missing Lifeguard', runtime: 50, description: 'Eleven and Max search for Heather while Dustin and Steve spy on deliveries.' },
        4: { title: 'Chapter Four: The Sauna Test', runtime: 53, description: 'The gang sets a trap in the sauna to test if Billy is possessed.' },
        5: { title: 'Chapter Five: The Flayed', runtime: 52, description: 'An army of Flayed citizens gathers under the steelworks.' },
        6: { title: 'Chapter Six: E Pluribus Unum', runtime: 60, description: 'Dr. Alexei reveals the secret Russian drilling operation under Starcourt.' },
        7: { title: 'Chapter Seven: The Bite', runtime: 55, description: 'The monster tracks the kids to the cabin, injuring Eleven.' },
        8: { title: 'Chapter Eight: The Battle of Starcourt', runtime: 77, description: 'Terror reigns in the food court as everyone risks everything to stop the Mind Flayer.' },
      },
    },
    4: {
      seasonNumber: 4,
      title: 'Season 4',
      description: 'The terrifying curse of Vecna.',
      episodes: {
        1: { title: 'Chapter One: The Hellfire Club', runtime: 76, description: 'High school struggles, D&D campaigns, and a gruesome murder shock Hawkins.' },
        2: { title: 'Chapter Two: Vecna\'s Curse', runtime: 77, description: 'A cursed cassette tape and a haunted grandfather clock lead to mystery.' },
        3: { title: 'Chapter Three: The Monster and the Superhero', runtime: 63, description: 'Eleven is confronted by police while Joyce and Murray fly to Alaska.' },
        4: { title: 'Chapter Four: Dear Billy', runtime: 79, description: 'Max runs up that hill as Vecna traps her mind in the cemetery.' },
        5: { title: 'Chapter Five: The Nina Project', runtime: 75, description: 'Owens takes Eleven to Nevada to help her regain her powers in an isolation tank.' },
        6: { title: 'Chapter Six: The Dive', runtime: 73, description: 'Steve dives into Lovers Lake and discovers a water gate to the Upside Down.' },
        7: { title: 'Chapter Seven: The Massacre at Hawkins Lab', runtime: 98, description: 'The identity of Vecna and One is finally revealed.' },
        8: { title: 'Chapter Eight: Papa', runtime: 85, description: 'Military forces raid the Nina bunker as Eleven makes her choice.' },
        9: { title: 'Chapter Nine: The Piggyback', runtime: 142, description: 'The epic two-and-a-half-hour showdown across three fronts to defeat Vecna.' },
      },
    },
    5: {
      seasonNumber: 5,
      title: 'Season 5 (Final Season)',
      description: 'The final battle for Hawkins and the world.',
      episodes: {
        1: { title: 'Chapter One: The Crawl', runtime: 60, description: 'Hawkins falls under military quarantine as the rift widens.' },
        2: { title: 'Chapter Two: The Vanishing of Wheelers', runtime: 58, description: 'New supernatural occurrences plague the remaining families in Hawkins.' },
        3: { title: 'Chapter Three: The Turnbow Trap', runtime: 56, description: 'Dustin and the Hellfire club set an intricate perimeter against the Upside Down.' },
        4: { title: 'Chapter Four: Sorcerer', runtime: 64, description: 'Eleven ventures deep into the origin memory of the Upside Down dimension.' },
        5: { title: 'Chapter Five: Shock Jock', runtime: 62, description: 'Pirate radio signals coordinate the resistance across town.' },
        6: { title: 'Chapter Six: Escape from Camazotz', runtime: 65, description: 'Hopper and Joyce execute a daring extraction maneuver.' },
        7: { title: 'Chapter Seven: The Bridge', runtime: 70, description: 'The threshold between dimensions begins collapsing completely.' },
        8: { title: 'Chapter Eight: The Rightside Up', runtime: 95, description: 'The ultimate climax and emotional conclusion of the Stranger Things saga.' },
      },
    },
  },

  // Solo Leveling
  '5940673723370990096': {
    1: {
      seasonNumber: 1,
      title: 'Season 1',
      episodes: {
        1: { title: 'I\'m Used to It', runtime: 24, description: 'Sung Jinwoo faces deadly trials as the weakest hunter.' },
        2: { title: 'If I Had One More Chance', runtime: 24, description: 'Trapped in the double dungeon, survival requires following the rules.' },
        3: { title: 'It\'s Like a Game', runtime: 24, description: 'Awakening in a hospital bed, Jinwoo discovers a mysterious gaming interface.' },
        4: { title: 'I\'ve Gotta Get Stronger', runtime: 24, description: 'Entering an instant dungeon, Jinwoo fights monsters alone to level up.' },
        5: { title: 'A Pretty Good Deal', runtime: 24, description: 'Jinwoo joins a strike squad for a C-Rank dungeon.' },
        6: { title: 'The Real Hunt Begins', runtime: 24, description: 'Betrayed inside the dungeon, Jinwoo must make a ruthless choice.' },
        7: { title: 'Let\'s See How Far I Can Go', runtime: 24, description: 'Pushing his limits, Jinwoo tackles Cerberus at Demon Castle.' },
        8: { title: 'Frustrating', runtime: 24, description: 'Returning to inspect the daily quest rewards and dungeon gates.' },
        9: { title: 'You\'ve Been Hiding Your Skills', runtime: 24, description: 'Kang Taeshik encounters Jinwoo in a dangerous confrontation.' },
        10: { title: 'What Is This, a Picnic?', runtime: 24, description: 'The Hunters Association observes Jinwoo\'s rapid growth.' },
        11: { title: 'A Knight Who Defends an Empty Throne', runtime: 24, description: 'Blood-Red Commander Igris challenges Jinwoo in a brutal duel.' },
        12: { title: 'Arise', runtime: 25, description: 'Jinwoo unlocks the ultimate necromancer class and commands the shadows.' },
      },
    },
  },
};

export function getEnrichedEpisode(
  subjectId: string,
  seasonNumber: number,
  episodeNumber: number
): EnrichedEpisodeData | null {
  const cleanId = subjectId.replace(/^mb-/, '');
  const showData = EPISODE_METADATA_REGISTRY[cleanId];
  if (!showData) return null;
  const seasonData = showData[seasonNumber];
  if (!seasonData) return null;
  return seasonData.episodes[episodeNumber] || null;
}
