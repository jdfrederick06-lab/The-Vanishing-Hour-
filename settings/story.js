/* =====================================================================
   THE VANISHING HOUR — the story file.
   Everything about the night lives here, NOT in the website code:
   who the characters are, the phases of the night, and the timed cues.
   When the story changes, edit this file only.

   DRAFT: built from the planning doc on Nov 11, 2026. Code words are
   temporary and unencrypted; they get locked when the site goes online.
   ===================================================================== */
const STORY = {

  /* ---- who can run the night ---- */
  hosts: [
    { code: 'CURATOR-00', name: 'Jacob', role: 'main', label: 'Main host' },
    { code: 'DEPUTY-210', name: 'Co-host', role: 'fbi', label: 'FBI handler', groups: ['fbi'] },
    { code: 'BROKER-930', name: 'Co-host', role: 'crew', label: 'Crew handler', groups: ['crew', 'thief', 'staff'] }
  ],

  /* ---- the five groups, and which world (door) each one lives in ---- */
  groups: {
    fbi:   { name: 'FBI',            door: 'fbi',       color: '#8ab8ff' },
    crew:  { name: 'Art crew',       door: 'nightwire', color: '#ff8a7a' },
    thief: { name: 'Diamond thief',  door: 'nightwire', color: '#ffd17a' },
    staff: { name: 'Staff',          door: 'bebbit',    color: '#8ee6ad' },
    guest: { name: 'Guests',         door: 'bebbit',    color: '#b9a2ff' }
  },

  worlds: {
    fbi:       { name: 'FBI Headquarters', tab: 'Records', soon: 'Records lookups, the statement log, the case board and warrants plug in here next. Bebbit is in your Bebbit tab, read-only.' },
    bebbit:    { name: 'Bebbit',           tab: 'Feed',    soon: 'The live feed, posts with photos, comments, votes and profile lookups plug in here next.' },
    nightwire: { name: 'NIGHTWIRE',        tab: 'Market',  soon: 'The data market, the crew wallet, NightBank payments and the burner chat plug in here next.' }
  },

  /* ---- Bebbit rules ----
     readOnly: groups that can read but not post, vote or comment.
     accounts: non-character accounts the host (and planted posts) can post as.
     powers:   per character. delete = remove posts, trace = see whose phone a post came from,
               hack = post disguised as someone else (shows a small "via relay" tell).
     photoCount: whose photo tags the host counts (Gray's socialite count). */
  bebbit: {
    readOnly: ['fbi'],
    accounts: {
      mod:     { name: 'thegala_mod',     role: 'b/thegala moderator',   profile: 'The official feed of tonight\'s Ashgrove Gala.' },
      archive: { name: 'ledger_archives', role: 'Harbor Ledger archive', profile: 'Photos from fifty years of the Harbor Ledger.' },
      /* background guests: not characters, just noise in the feed */
      cityscene: { name: 'thecityscene',       role: 'Society column, City Magazine', profile: 'Who wore what, who left with whom.' },
      eats:      { name: 'harborhill_eats',    role: 'Food blogger',                  profile: 'Eating my way through every party in town.' },
      champagne: { name: 'champagne_problems', role: 'Guest (a donor\'s plus-one)',    profile: 'Here for the bubbles.' },
      nora:      { name: 'nora.paints',        role: 'Art student',                    profile: 'Oils, mostly. Coffee, always.' },
      bev:       { name: 'grandma_bev',        role: 'Retired museum docent',          profile: '22 years of tours. Ask me anything.' },
      cliff:     { name: 'cliff_is_lost',      role: 'Guest',                          profile: 'Bad with directions.' },
      axel:      { name: 'artbro_axel',        role: 'Aspiring collector',             profile: 'Buying low. Hot takes high.' },
      serverk:   { name: 'server_k',           role: 'Catering staff (agency)',         profile: 'Carrying trays since 2019.' },
      marcus:    { name: 'marcusinmarketing',  role: 'Guest',                          profile: 'Brand storyteller. Open-bar enthusiast.' }
    },
    /* background chatter: posted automatically by the clock at these night minutes (0 = doors).
       It mixes in with the real posts so the important ones are harder to spot. */
    chatter: [
      { at: 2,   by: 'cityscene', text: 'Arrivals at the Ashgrove Gala. Spotted so far: a city councilmember, a film star, and at least three people pretending not to know each other.' },
      { at: 6,   by: 'eats',      text: 'The crab cakes are a 9 out of 10. The tiny forks are a 2.' },
      { at: 9,   by: 'champagne', text: 'My date abandoned me at the coat check to "network." Rating this party on the champagne alone. So far: excellent.' },
      { at: 13,  by: 'nora',      text: 'First time seeing the Ashgrove Collection in person. The harbor paintings are unreal. I could stare at the brushwork all night.' },
      { at: 17,  by: 'bev',       text: 'I gave tours in this building for 22 years. They\'ve rehung the Valcourt three times since I retired. Nobody asks the docents.' },
      { at: 21,  by: 'cliff',     text: 'Does anyone know where the bathroom is. I have now seen the kitchen twice.' },
      { at: 25,  by: 'axel',      text: 'Hot take: half the art in here is overrated. Fight me in the east hall.' },
      { at: 29,  by: 'serverk',   text: 'To whoever ordered a martini "shaken, then stirred, then shaken again": we know who you are.' },
      { at: 33,  by: 'marcus',    text: 'The lighting in here is doing incredible things for my skin. Thank you, Ashgrove.' },
      { at: 40,  by: 'champagne', text: 'Why did two security people just walk past me looking stressed. Is it the champagne or is it me.' },
      { at: 46,  by: 'cityscene', text: 'Our photographer counts 112 guests, four ice sculptures and one very large diamond.' },
      { at: 52,  by: 'eats',      text: 'Did an alarm just go off?? I dropped my canapé.' },
      { at: 58,  by: 'nora',      text: 'Everyone is whispering and my phone is on 3%. Worst possible timing.' },
      { at: 66,  by: 'serverk',   text: 'We\'ve just been told nobody leaves. Hope everyone likes cheese, because we have a LOT of cheese.' },
      { at: 72,  by: 'bev',       text: 'In my day the guards walked every stairwell on the hour. Just saying.' },
      { at: 76,  by: 'cliff',     text: 'Update: found the bathroom. Lost my coat.' },
      { at: 88,  by: 'axel',      text: 'If anyone is taking requests for which painting to steal next, I have notes.' },
      { at: 98,  by: 'marcus',    text: 'Can someone explain what is happening. I came for the open bar.' },
      { at: 110, by: 'champagne', text: 'Plot twist: my date just got back and says he "saw nothing." Suspicious.' },
      { at: 124, by: 'cityscene', text: 'Developing: guests are still inside the Ashgrove Collection. More in the morning edition.' }
    ],
    powers: { drew: { delete: 2, trace: 1 }, jules: { hack: 2 } },
    photoCount: 'gray'
  },

  /* ---- the cast. key:true = the night needs this player (host gets warned if they're missing) ---- */
  characters: [
    /* FBI */
    { id: 'dana',     name: 'Dana Ward',            group: 'fbi',   role: 'Special Agent in Charge',        age: 27, code: 'WARRANT-582',   key: true,  profile: 'Leads the FBI Art Crime Team\'s protection details. Tonight she is responsible for the Winter Star.' },
    { id: 'rowan',    name: 'Rowan Hale',           group: 'fbi',   role: 'Special Agent',                  age: 26, code: 'BADGE-306',  key: true,  profile: 'Joined the FBI three years ago. Known for meticulous notes and an unnerving memory for faces.' },
    { id: 'ellis',    name: 'Ellis Brooks',         group: 'fbi',   role: 'Special Agent',                  age: 34, code: 'PARTNER-741',  key: true,  profile: 'Eight years with the Bureau and the cleanest case files in the unit. Partnered with Rowan Hale.' },
    { id: 'noor',     name: 'Noor Haddad',          group: 'fbi',   role: 'Intelligence Analyst',           age: 31, code: 'CIPHER-219', profile: 'Joined the Art Crime detail this week. Vetting the guest list and running records checks.' },
    { id: 'kit',      name: 'Kit Locke',            group: 'fbi',   role: 'Evidence Technician',            age: 35, code: 'PRINTS-463',   profile: 'Eight years in the state crime lab. Handles evidence and keeps the case board.' },
    /* Crew */
    { id: 'sloane',   name: 'Sloane Archer',        group: 'crew',  role: 'Art handler',   alias: 'Blueprint', age: 38, code: 'CRATE-857',  key: true,  profile: 'Has handled the Ashgrove Collection for the past year. On hand for tonight\'s unveiling.' },
    { id: 'frankie',  name: 'Frankie Doyle',        group: 'crew',  role: 'Catering',      alias: 'Tumbler',   age: 36, code: 'TUMBLER-194',  key: true,  profile: 'Working the gala with the catering team. Ask her about the crab cakes. Actually, don\'t.' },
    { id: 'jules',    name: 'Jules Moreau',         group: 'crew',  role: 'Touring tech for Jet Okonkwo', alias: 'Static', age: 33, code: 'STATIC-628', key: true, profile: 'Pop star Jet Okonkwo\'s touring tech, here tonight to run Jet\'s show. If a microphone squeals, Jules is already on it.' },
    { id: 'casey',    name: 'Casey Brandt',         group: 'crew',  role: 'Catering driver', alias: 'Clutch',  age: 31, code: 'ENGINE-375',   profile: 'Drives for the catering company. In and out of the loading area all night.' },
    { id: 'blair',    name: 'Blair Devereaux',      group: 'crew',  role: 'Collector',     alias: 'Velvet',    age: 34, code: 'VELVET-912',   profile: 'Heir to the Devereaux shipping fortune of Marseille, in town to begin a private art collection.' },
    /* Diamond thief */
    { id: 'vivienne', name: 'Vivienne Roux',        group: 'thief', role: 'Guest of Dominique Saint-Clair', alias: 'Magpie', age: 30, code: 'PERFUME-541', key: true, profile: 'A friend of Dominique Saint-Clair from Geneva. Consultant in "private acquisitions."' },
    /* Staff */
    { id: 'lane',     name: 'Lane Garrity',         group: 'staff', role: 'Head of security',               age: 52, code: 'KEYCARD-736', key: true,  profile: 'Twenty years as a city detective. Every guard, door and camera tonight answers to Lane.' },
    { id: 'charlie',  name: 'Charlie Pruitt',       group: 'staff', role: 'Night guard',                    age: 21, code: 'TORCH-258',  key: true,  profile: 'Works nights at the museum while studying criminal justice. Posted on the east hall.' },
    { id: 'bo',       name: 'Bo Tate',              group: 'staff', role: 'Night guard',                    age: 44, code: 'PATROL-684',   key: true,  profile: 'Fifteen years of nights at the museum. Knows every creak in the building.' },
    { id: 'harper',   name: 'Harper Quill',         group: 'staff', role: 'Event manager',                  age: 29, code: 'CLIPBOARD-327', key: true,  profile: 'Managing tonight\'s gala from first toast to last car. Find the person with the clipboard.' },
    { id: 'jamie',    name: 'Jamie Ruiz',           group: 'staff', role: 'Head bartender',                 age: 35, code: 'MARTINI-495',  key: true,  profile: 'Has run the bar at the museum\'s events for six years. Everyone tells Jamie everything.' },
    /* Guests */
    { id: 'victor',   name: 'Victor Ashgrove',      group: 'guest', role: 'Collector and host',             age: 58, code: 'CHAMPAGNE-170',   key: true,  profile: 'Rebuilt a family name from nothing. Tonight the Ashgrove Collection is on display for one night only.' },
    { id: 'remy',     name: 'Remy Laurent',         group: 'guest', role: 'Victor\'s fiancé(e)',            age: 34, code: 'BOUQUET-163',  key: true,  profile: 'A former gallery director, engaged to Victor Ashgrove. The wedding is set for June.' },
    { id: 'quincy',   name: 'Quincy Abernathy',     group: 'guest', role: 'Victor\'s lawyer',               age: 66, code: 'GAVEL-842',   profile: 'Victor Ashgrove\'s attorney since 1997. Impeccable manners and a gold pocket watch.' },
    { id: 'penn',     name: 'Penn Calloway',        group: 'guest', role: 'Victor\'s money manager',        age: 45, code: 'LEDGER-579',  profile: 'Of Calloway Private. Manages the Ashgrove family fortune.' },
    { id: 'marlowe',  name: 'Marlowe Pike',         group: 'guest', role: 'Victor\'s assistant',            age: 49, code: 'CALENDAR-216',   profile: 'Has run Victor Ashgrove\'s life for 27 years. If you want Victor, you go through Marlowe.' },
    { id: 'emerson',  name: 'Emerson Albright',     group: 'guest', role: 'Museum director',                age: 48, code: 'ATRIUM-907', profile: 'Has directed the museum for six years. Personally certified the Ashgrove Collection.' },
    { id: 'ari',      name: 'Dr. Ari Castellane',   group: 'guest', role: 'Chief curator',                  age: 47, code: 'VARNISH-354',   key: true,  profile: 'Chief curator for eleven years. Personally installed every piece of tonight\'s collection.' },
    { id: 'peregrine',name: 'Peregrine Vale',       group: 'guest', role: 'Art critic',                     age: 58, code: 'CRITIQUE-681',  profile: 'Host of Vale of Tears, television\'s most feared art show.' },
    { id: 'sterling', name: 'Sterling Voss',        group: 'guest', role: 'Insurance appraiser',            age: 39, code: 'POLICY-723', profile: 'Senior claims investigator for Harbor & Crane Insurance. Here to inspect the collection.' },
    { id: 'dominique',name: 'Dominique Saint-Clair',group: 'guest', role: 'Owner of the Winter Star',       age: 52, code: 'STARLIGHT-468',   profile: 'Of Geneva and New York. Has lent the Winter Star, the third-largest diamond in the country.' },
    { id: 'drew',     name: 'Drew Kincaid',         group: 'guest', role: 'Founder of Bebbit',              age: 19, code: 'UPVOTE-195',   profile: 'Built Bebbit in his bedroom at 15. The youngest billionaire in the country.' },
    { id: 'ainsley',  name: 'Ainsley Vandermeer',   group: 'guest', role: 'Old-money heir',                 age: 68, code: 'HEIRLOOM-640',  profile: 'The last of the Vandermeers, whose name is carved over the museum\'s front doors.' },
    { id: 'cameron',  name: 'Cameron Thorne',       group: 'guest', role: 'Investor',                       age: 42, code: 'INTEREST-287',   profile: 'Runs Thorne Capital, which holds most of Victor Ashgrove\'s outstanding loans.' },
    { id: 'gray',     name: 'Gray Bishop',          group: 'guest', role: 'City councilmember',             age: 34, code: 'PODIUM-531',  profile: 'The youngest person ever elected to the city council. Expected to run for governor.' },
    { id: 'skyler',   name: 'Skyler Monroe',        group: 'guest', role: 'Film star',                      age: 38, code: 'SPOTLIGHT-874',profile: 'The most beloved actor in the country. Famously feuding with Jet Okonkwo.' },
    { id: 'jet',      name: 'Jet Okonkwo',          group: 'guest', role: 'Pop musician',                   age: 29, code: 'MELODY-302',  profile: 'The album Afterglow was the year\'s biggest. Performs tonight.' },
    { id: 'bailey',   name: 'Bailey Sparks',        group: 'guest', role: 'Influencer',                     age: 24, code: 'SELFIE-659', profile: 'Bebbit\'s top lifestyle creator, and the gala\'s official social media partner.' },
    { id: 'parker',   name: 'Parker Lowell',        group: 'guest', role: 'Journalist',                     age: 33, code: 'SCOOP-148',profile: 'Broke the story the press called "the Ward Fake." Writes about money and power.' },
    { id: 'hollis',   name: 'Hollis Grant',         group: 'guest', role: 'Founder, Grant Energy',          age: 61, code: 'PIPELINE-765', profile: 'Co-founded Ashgrove & Grant in 1993. Currently suing his former partner.' },
    { id: 'lennox',   name: 'Lennox Blackwood',     group: 'guest', role: 'Collector',                      age: 64, code: 'OBSIDIAN-391',   profile: 'Owner of the Blackwood Collection. Victor Ashgrove\'s rival for thirty years.' },
    { id: 'indigo',   name: 'Indigo Hart',          group: 'guest', role: 'Painter',                        age: 44, code: 'CANVAS-527', profile: 'A painter famously savaged on Vale of Tears in 2019. Has not exhibited since.' },
    { id: 'wren',     name: 'Wren Whitaker',        group: 'guest', role: 'Former Ashgrove & Grant analyst',age: 36, code: 'WHISTLE-806',profile: 'Reported Ashgrove & Grant to federal regulators in 2020. The company sued.' },
    { id: 'kendall',  name: 'Kendall Ashgrove-Moore', group: 'guest', role: 'Victor\'s ex-spouse',          age: 56, code: 'KEEPSAKE-273', profile: 'Runs Moore & Partners public relations. Married to Victor from 1998 to 2009. Kept the name.' },
    { id: 'dusty',    name: 'Dusty Featherstone',   group: 'guest', role: 'Podcaster',                      age: 41, code: 'ECHO-619',  profile: 'Hosts Wake Up, America. Here tonight for reasons he describes as "classified."' }
  ],

  /* ---- the night. min = default length in minutes (the host can change lengths in Setup).
          cues: at = minutes into the phase. to = 'all', 'g:<group>', 'door:<world>' or character ids.
          text goes to those players' phones. host = a private reminder for the host. ---- */
  phases: [
    { id: 'arrive', name: 'Arrivals and briefings', short: 'Briefings', min: 15,
      note: 'Guests arrive and sign in. Every group gets its private briefing at the same time.',
      todo: ['Everyone is signed in on their phone', 'FBI, crew and staff briefings are done', 'June\'s painting and the dart are in place'],
      cues: [
        { at: 0, to: 'all', title: 'Welcome', text: 'Welcome to the Ashgrove Gala. Find your group\'s briefing, then read your dossier.' },
        { at: 1, post: { by: 'mod', text: 'Welcome to b/thegala, the official feed of tonight\'s Ashgrove Gala. Post your photos, tag your friends, and be nice. Mostly.' } }
      ] },
    { id: 'act1', name: 'Act I: the gala', short: 'Act I', min: 35,
      note: 'The night runs. Every group works its goals. The diamond is on display; the painting is still in the vault.',
      say: 'Welcome to the Ashgrove Collection. One night only. Please, enjoy yourselves.',
      todo: ['Victor gave the opening toast', 'Charlie told Bo about the locker'],
      cues: [
        { at: 3,  post: { by: 'archive', text: 'From the Harbor Ledger archive: Victor Ashgrove at a gallery opening, December 2000. Does anyone know who the young woman beside him is?' }, host: 'Draft stand-in for clue 3 (the 2001 photo). The real photo and its backup are still pinned.' },
        { at: 5,  to: ['jet', 'jules'], title: 'Showtime', text: 'Jet performs now. Jules: start the backing track.' },
        { at: 10, to: ['charlie'], title: 'Now or never', text: 'Find Victor and try to give the money back. Let people overhear some of it.' },
        { at: 15, to: ['peregrine'], title: 'Your speech', text: 'Give your speech now: declare the Ashgrove Collection genuine and priceless.' },
        { at: 25, to: ['charlie'], title: 'Radio call', text: 'Your radio calls you to the vault stairs. Say out loud so Bo hears: "Copy, heading to the vault stairs. Wait, who is this?" Then go.', host: 'Charlie is heading to the vault stairs.' },
        { at: 25, to: ['rowan'], title: 'The window', text: 'Tell Ellis you heard a noise. Go to the vault stairs now.' },
        { at: 25, to: ['hollis', 'remy'], title: 'A private word', text: 'Hollis: pull Remy into the east hall and tell the truth. Remy: go with Hollis.' },
        { at: 32, to: ['harper', 'dominique'], title: 'The photograph', text: 'Gather everyone at the Winter Star for the press photograph.' },
        { at: 34, to: ['victor'], title: 'The signal', text: 'Tap your glass twice. Then turn the room toward the Winter Star.' }
      ] },
    { id: 'diamond', name: 'The diamond', short: 'Diamond', min: 10,
      note: 'Vivienne reaches for the Winter Star and the alarm goes off. While every eye is on her, the crew takes the painting.',
      todo: ['Vivienne is in custody', 'The crew is back upstairs', 'June\'s painting is hanging in the vault'],
      cues: [
        { at: 0, to: ['vivienne'], title: 'Now', text: 'The Winter Star is out of its case. Take it.' },
        { at: 0, to: ['g:crew'], title: 'Go', text: 'That\'s the signal. Jules: cameras off. Frankie, Sloane, Casey: the vault. Blair: keep the room watching the diamond.' },
        { at: 1, to: ['dana'], title: 'Alarm', text: 'The diamond alarm is going off. Arrest whoever is holding the Winter Star.' },
        { at: 5, to: ['rowan'], title: 'Back upstairs', text: 'Leave your mother\'s painting where his was. Be back in the main room in five minutes.' }
      ] },
    { id: 'act2', name: 'Act II: the investigation', short: 'Act II', min: 20,
      note: 'Charlie is found. The building locks down. The FBI holds Vivienne and suspects the crew.',
      say: 'Nobody leaves this building without my say-so.',
      todo: ['Bo found Charlie', 'Lockdown announced', 'Rowan has Sloane\'s box cutter'],
      cues: [
        { at: 0,  to: ['bo'], title: 'Charlie', text: 'Charlie isn\'t answering his radio. Go check the vault stairs.', host: 'Bo is about to find Charlie.' },
        { at: 2,  to: ['dana', 'lane'], title: 'Lockdown', text: 'A guard is dead. Lock the building down and announce it.' },
        { at: 2,  to: ['ari'], title: 'The vault', text: 'You\'re needed in the vault. The painting there isn\'t the one you installed.' },
        { at: 4,  to: ['emerson'], title: 'Oops', text: 'You meant to text your intern about the exhibit. Instead it just posted to Bebbit, under your name: "It has to stay quiet. Nobody can know."', post: { by: 'emerson', text: 'It has to stay quiet. Nobody can know.' } },
        { at: 5,  to: ['rowan'], title: 'The box cutter', text: 'Interview Sloane. Take the box cutter "as a precaution." Don\'t log it.' },
        { at: 8,  to: ['bailey'], title: 'Still bugging you', text: 'Post it: where did the sexy FBI agent disappear to at 0:45?' },
        { at: 12, to: ['victor'], title: 'You need air', text: 'You\'ve seen the painting in the vault. Tell someone you need some air and go to the side room.', host: 'Victor is heading to the side room.' },
        { at: 13, to: ['sloane'], title: 'Find Victor', text: 'The lockdown has trapped the painting. Find Victor in the side room and ask what now.' },
        { at: 16, to: ['rowan'], title: 'Your turn', text: 'Sloane has left him. Go to Victor. Tell him who you are.' },
        { at: 16, to: ['victor'], title: 'A visitor', text: 'Agent Hale is coming. Hear him out. Then write one word on the napkin: JUNE.' }
      ] },
    { id: 'victor', name: 'Victor is found', short: 'Victor', min: 5,
      note: 'Victor is found in the side room with Sloane\'s box cutter and a napkin that says JUNE.',
      say: 'Victor Ashgrove is dead. Whoever did this is still in this building.',
      todo: ['Victor\'s body was found', 'The JUNE napkin and the clipping half are on him'],
      cues: [
        { at: 1, to: ['dana'], title: 'Announce it', text: 'Victor Ashgrove has been found dead. Announce it to the room.' },
        { at: 3, to: ['dana'], title: 'From your boss', text: '"The councilmember\'s office called. Wrap this up tonight."' }
      ] },
    { id: 'turn', name: 'The investigation deepens', short: 'The turn', min: 20,
      note: 'Who inherits? The guests start connecting 2001, June and the painting. Vivienne\'s memories come back.',
      todo: ['Reese Delgado has arrived', 'Ari revealed the fakes'],
      cues: [
        { at: 0,  to: ['vivienne'], title: 'A memory', text: 'A little boy who drew on every wall.' },
        { at: 5,  to: ['charlie'], title: 'A new arrival', text: 'If you\'re coming back: you are now Reese Delgado, Sterling\'s boss. Collect your card from the host.', host: 'Reese Delgado arrives (Charlie\'s player).' },
        { at: 6,  to: ['vivienne'], title: 'A memory', text: 'The pantry lock.' },
        { at: 12, to: ['vivienne'], title: 'A memory', text: 'A name. "Ro."' },
        { at: 15, to: ['ari'], title: 'It\'s time', text: 'If you haven\'t yet: reveal the fakes, with your proof.' },
        { at: 15, to: ['bo'], title: 'The locker', text: 'If you haven\'t yet: decide what to do with what\'s in Charlie\'s locker.' }
      ] },
    { id: 'push', name: 'The final push', short: 'Final push', min: 15,
      note: 'Everything is on the table. Groups make their last moves before the vote.',
      todo: ['Kit posted the evidence findings', 'The crew made its last sale attempt'],
      cues: [
        { at: 0, to: 'all', title: 'Fifteen minutes', text: 'The vote is coming. Share what you know, and decide who you believe.' },
        { at: 2, to: ['kit'], title: 'Post your findings', text: 'If you\'re still holding anything back, post it to the case board now.' }
      ] },
    { id: 'vote', name: 'The accusation', short: 'Accusation', min: 10,
      note: 'Everyone votes: who took the painting, and who is the killer. FBI votes count double. Dana makes the arrest.',
      todo: ['Voting is open', 'Dana made the arrest'],
      cues: [
        { at: 0, to: 'all', title: 'Cast your vote', text: 'Voting is open. Who stole the painting? Who is the killer?' }
      ] },
    { id: 'truth', name: 'The truth', short: 'Truth', min: 10,
      note: 'The reveal, then each group\'s results.',
      todo: ['The truth was read', 'Group results announced'],
      cues: [] },
    { id: 'curtain', name: 'Curtain', short: 'Curtain', min: 10,
      note: 'Photos, awards and goodnights.',
      todo: [],
      cues: [] }
  ],

  /* ---- the evidence board (labels only for now; the clues themselves come with the evidence build) ---- */
  clues: [
    ['01', 'Insurance policy'], ['02', 'Assignment request'], ['03', '2001 photo'], ['04', 'The dart'],
    ['05', 'Radio log'], ['06', 'Arrest report'], ['07', 'June\'s letter'], ['08', 'Accident clipping'],
    ['09', 'Estate letter'], ['10', 'Search log'], ['11', 'Personnel file'], ['12', 'Sealed record'],
    ['13', 'June\'s painting'], ['14', 'DNA report'], ['15', 'Vivienne\'s memory']
  ],
  herrings: [
    ['R1', 'Crew route'], ['R2', 'Enemies list'], ['R3', 'Threat letter'], ['R4', 'Thief\'s record'], ['R5', 'Forged appraisal'], ['R6', 'Deleted messages']
  ],

  /* ---- FBI Headquarters rules ----
     lookups:  shared by the whole team for the night (the host can add more).
     lead:     the Special Agent in Charge: the only one who can issue warrants and detain.
     warrants: how many the lead can issue. A warrant unseals "needs: 'warrant'" sections
               of that person's record, and tells the person to show agents what they carry.
     cleared:  who can read "needs: 'clearance'" sections (Noor's restricted case).
     homicides: a homicide is added to the case header when each of these phases starts. */
  fbi: { caseNo: '27-0417', lookups: 10, lead: 'dana', warrants: 3, cleared: ['noor'], homicides: ['act2', 'victor'] },

  /* ---- the accusation (the vote) ----
     Voting opens by itself when "The accusation" phase starts (the host can also open or close it).
     Every player answers two questions on their phone and can change their answers until it closes.
     weights:       whose vote counts for more (the FBI's counts double)
     noVote:        who doesn't get a ballot (the dead; anyone thrown out never votes either)
     notCandidates: who can't be named (the victims)
     arrestBy:      who makes the arrest when voting closes: the first of these who isn't a no-show */
  vote: {
    questions: [['thief', 'Who stole the painting?'], ['killer', 'Who is the killer?']],
    weights: { fbi: 2 },
    noVote: ['victor', 'charlie'],
    notCandidates: ['victor', 'charlie'],
    arrestBy: ['dana', 'ellis', 'kit']
  },

  /* ---- NIGHTWIRE and NightBank ----
     wallets: special accounts. members = who can spend it ('g:crew' = the whole crew shares it).
              bank:true = NightBank only (no market). Everyone NOT covered here gets a personal
              NightBank account automatically, holding their "spending" amount below.
     spending: each character's NightBank money. It should reflect their net worth (Jacob, Nov 11).
              Anyone missing gets their group's default. The host can add or take money from any
              account during the night (host terminal > People or NIGHTWIRE).
              pending = money promised but not paid; it shows as VOID once voidAt's phase starts.
     buyers:  who the crew can pitch the painting to. goal = the crew's sale target.
     market:  data for sale. for = which groups see it. from = the phase it appears in.
              Each file sells ONCE: the first buyer gets it and it shows SOLD to everyone else.
              Prices are set so the crew's starting money buys about two files (Jacob, Nov 11).
              clue = marks that evidence found on the host's board when someone buys it.
     DRAFT: every amount and item is a placeholder for the evidence and net-worth passes. */
  nightwire: {
    goal: 40000000,
    saleItem: 'The Vanishing Hour (Henri Valcourt, 1874), the star of the Ashgrove Collection',
    /* the sale's money is held in escrow until this phase starts (1:45, the final push) */
    escrowUntil: 'push',
    wallets: {
      crew:     { name: 'ghost_crew', members: ['g:crew'], start: 500000, pending: { amount: 1500000, label: 'Due from your client on delivery', voidAt: 'victor' } },
      /* Vivienne: just enough for ONE early file to trade the FBI for her release. Anything more,
         someone else has to send her the money (she's the guests' and FBI's way into NIGHTWIRE). */
      vivienne: { name: 'magpie', members: ['vivienne'], start: 200000 },
      /* the buyers' "start" is money ON HAND (approved Nov 12); the rest is tied up, see freeUp */
      drew:     { name: 'Drew Kincaid', members: ['drew'], start: 15000000, bank: true },
      ainsley:  { name: 'Ainsley Vandermeer', members: ['ainsley'], start: 8000000, bank: true },
      lennox:   { name: 'Lennox Blackwood', members: ['lennox'], start: 12000000, bank: true },
      cameron:  { name: 'Cameron Thorne', members: ['cameron'], start: 10000000, bank: true },
      harper:   { name: 'Harper Quill', members: ['harper'], start: 0, bank: true }
    },
    /* Money on hand vs. money tied up (Jacob, Nov 12). Nobody starts with $40M on hand.
       "Free up money" (NightBank) adds amt after a wait of `wait` GAME minutes (it pauses
       when the clock pauses). Once per person per night. The host can make it arrive now. */
    freeUp: {
      hollis:    { amt: 60000000, wait: 90 },
      drew:      { amt: 30000000, wait: 90 },
      lennox:    { amt: 25000000, wait: 90 },
      ainsley:   { amt: 25000000, wait: 120, why: 'Old money moves slowly.' },
      dominique: { amt: 20000000, wait: 90 },
      cameron:   { amt: 20000000, wait: 60, why: 'Your firm lends money for a living.' },
      skyler:    { amt: 8000000,  wait: 90 },
      kendall:   { amt: 4000000,  wait: 90 },
      jet:       { amt: 2000000,  wait: 90 }
    },
    /* The charity casino, inside NightBank (casino.js). What the house wins on each round goes to
       Dominique's foundation, with `harperCut` of it to Harper as the event fee. Open from `opens`
       until `closes` starts (the host can also force it open or closed).
       THE HOUSE ALWAYS HAS THE EDGE (Jacob, Nov 12). Every bet pays less than its true odds:
         Roulette: American wheel (0 and 00). Every bet loses 5.26% on average.
         Blackjack: 6 decks, blackjack pays 6 to 5, dealer hits soft 17, no splits. About 2-3%.
         Lucky dice: 11% to 17% on every bet.
       minBet / maxBet are per round (all chips on the table together). */
    casino: { name: 'The Saint-Clair Foundation Casino', short: 'Saint-Clair Casino', beneficiary: 'dominique', feeTo: 'harper', harperCut: 0.10,
              minBet: 1000, maxBet: 5000000, chips: [1000, 10000, 100000, 1000000, 5000000],
              opens: 'act1', closes: 'vote', bigWin: 250000,
              /* who may play (Jacob, Nov 12): NOT the FBI. The crew and Vivienne play from NIGHTWIRE
                 (a CASINO tab there, betting from their own wallet); guests and staff from NightBank. */
              groups: ['guest', 'staff', 'crew', 'thief'] },
    /* Cameron's loans (Jacob, Nov 12): his call on the rate. An unpaid loan past its due time lets
       him freeze the borrower's account by court order and name them publicly. Repaying lifts
       a court freeze. Being thrown out of the gala is the host's call (host terminal > People). */
    lending: { lender: 'cameron', min: 5000, max: 100000, rateMin: 100, rateMax: 250, terms: [15, 30, 45, 60] },
    /* who can unfreeze one account, once (Jacob, Nov 12). The FBI lead can freeze the account of
       anyone they hold a warrant for. The host can freeze or unfreeze anyone. */
    unfreezers: ['jules'],
    /* The vault dial (mini-game 1, approved Nov 12): three numbers from three crew sources.
       1 = in the vault schematic file above, 2 = Sloane's dossier, 3 = the vault-keypad camera
       Jules sees during the camera loop (mini-game 2). Change all three places together. */
    vault: { combo: [24, 61, 9] },
    /* Spending money that follows each fortune (money on hand tonight). */
    spending: {
      defaults: { guest: 250000, staff: 2500, fbi: 5000, crew: 0, thief: 0 },
      hollis: 20000000, dominique: 10000000, skyler: 4000000, kendall: 2000000, jet: 1000000,
      peregrine: 600000, quincy: 400000, emerson: 300000, gray: 150000, ari: 40000, sterling: 20000,
      penn: 20000, marlowe: 15000, bailey: 1500, wren: 2000, dusty: 8000, remy: 5000, parker: 3000,
      indigo: 1500, victor: 25000, charlie: 76200, lane: 8000, bo: 2000, jamie: 1500
    },
    /* Hollis can bid directly too (Jacob, Nov 12), as well as through Cameron */
    buyers: ['drew', 'ainsley', 'lennox', 'cameron', 'hollis'],
    market: [
      { id: 'vault', title: 'Museum vault schematic + guard rotation', seller: 'bluepr1nt', price: 150000, for: ['crew'],
        teaser: 'One door, one dial, one guard.', body: 'Vault: one steel door, two ways in. The digital lock reads codes that rotate every 5 minutes (staff digital keys only). The backup is an old three-number combination dial (left, right, left). First number of the dial: 24. The other two are not in any file we could reach. Stairs from the east hall. Guard rotation tonight: C. Pruitt, east hall and vault stairs, all night.' },
      { id: 'bankvictor', title: 'Bank records · the host', seller: 'ledgr_ghost', price: 250000, for: ['crew', 'thief'],
        teaser: 'Every account. Every transfer. Ten years.', body: 'Loans in default to Thorne Capital: $15M+.\nOut, 3 weeks ago: $75,000 to a NightBank account (C. Pruitt).\nIn, last year: $4,000,000 from Kincaid Holdings ("consulting").\nIn, 2019: $30,000,000 from Larkspur Holdings, Cyprus.' },
      { id: 'ashfall', title: 'Who is "ashfall"?', seller: 'tr4cer', price: 400000, for: ['crew'],
        teaser: 'The seller who sold you your gear.', body: 'Seller "ashfall": 11 sales in 2 months, all to you. Payment trail runs through three relays and ends inside a government network. Identity: unknown.' },
      /* Parker's tips (decided Nov 11): tip 2's metadata shows ashfall's relay. Tip 1 matches Victor's toast card wording (paper). */
      { id: 'tips', title: 'Who tipped off the journalist?', seller: 'tr4cer', price: 100000, for: ['crew', 'thief'],
        teaser: 'Two anonymous tips to Parker Lowell. Two different senders.', body: 'Tip 1 (two weeks ago, "won\'t survive the night"): sent from a hotel business center downtown. No relay. Whoever wrote it likes a dramatic phrase.\nTip 2 (three days ago, the five names): routed through the same three relays as the seller "ashfall," ending inside a government network.' },
      { id: 'donors', title: 'Museum donor list · secret exhibit', seller: 'curatrix', price: 200000, for: ['crew', 'thief'],
        teaser: 'Who paid for the exhibit nobody\'s allowed to see.', body: 'Treasures of the Private World. Donors: Lennox Blackwood $12,000,000. Skyler Monroe $3,000,000 (anonymous). Four more, undisclosed. Several lent objects have no export papers.' },
      { id: 'shells', title: 'Campaign money · Bishop for Governor', seller: 'ledgr_ghost', price: 175000, for: ['crew', 'thief'],
        teaser: 'Thirty-one donors. One wallet.', body: 'Thirty-one shell companies have funded Gray Bishop\'s campaign. All of them trace back to Grant Energy (Hollis Grant).' },
      { id: 'bebbitdata', title: 'Bebbit user data · proof of sale', seller: 'insider_b', price: 125000, for: ['crew', 'thief'],
        teaser: 'What the app does with your messages.', body: 'Internal documents: Bebbit sells users\' locations, searches and private messages to data brokers. Approved by the founder.' },
      { id: 'devereaux', title: 'Identity check · "Blair Devereaux"', seller: 'kyc_kid', price: 40000, for: ['thief'],
        teaser: 'Is the heiress real?', body: 'No Devereaux shipping family exists. The company website was registered six weeks ago. The name is a cover.' },
      { id: 'birth', title: 'Sealed birth record · 2001', seller: 'c0ld_case', price: 1500000, for: ['crew', 'thief'], from: 'act2', clue: '12',
        teaser: 'Route 9 county. One infant. Sealed by the court.', body: 'Birth record, Harlow County, February 2001. Mother: June Ellery. Father: not named. Child: Rowan Ellery. Adopted 2008; record sealed by the court.' },
      { id: 'dna', title: 'Private DNA report', seller: 'c0ld_case', price: 3000000, for: ['crew', 'thief'], from: 'turn', clue: '14',
        teaser: 'A paternity test someone paid to keep quiet.', body: 'Paternity test, private lab, last spring. Sample A: a coffee cup (V. Ashgrove). Sample B: submitted by R. Hale. Probability of paternity: 99.98%.' }
    ]
  },

  /* ---- federal records (what a lookup returns) ----
     DRAFT, built from the dossiers. Anyone without a record here gets a plain one made from
     their public profile. names = what a search matches. clue = marks that evidence found on
     the host's board the first time an agent sees that section.
     noMatch: true = searching this name finds nothing (Blair's fake identity). */
  records: [
    { id: 'victor', who: 'victor', names: ['Victor Ashgrove', 'Victor James Ashgrove', 'Ashgrove'], title: 'ASHGROVE, Victor James',
      fields: [['Born', '1968'], ['Occupation', 'Collector · chairman, Ashgrove & Grant'], ['Criminal record', 'None'], ['Financial', 'Several loans in default (Thorne Capital)'], ['Insurance', 'Coverage on The Vanishing Hour raised 40% last month, to $115,000,000 (Harbor & Crane)']],
      notes: ['Married Kendall Moore, 1998. Divorced 2009. Currently engaged (R. Laurent).'],
      sections: [
        { title: 'Inquiry LARKSPUR', body: 'Subject of an open Counterintelligence inquiry: Meridian Optics designs transferred abroad via Larkspur Holdings (Cyprus), 2019. Cooperation talks in progress.', needs: 'clearance' },
        { title: 'Related press, Harbor Ledger, March 14, 2001', body: '"Young mother dies in Route 9 crash. June Ellery, 23, an art student of Harlow County, was killed Tuesday night when her car left Route 9 in heavy rain. She is survived by an infant son." Found in a records sweep of Ashgrove & Grant\'s 2001 correspondence.', needs: 'warrant', clue: '08' }
      ] },
    { id: 'rowan', who: 'rowan', names: ['Rowan Hale', 'Hale'], title: 'HALE, Rowan · Special Agent', kind: 'personnel',
      fields: [['Born', 'February 2001'], ['Position', 'Special Agent, Art Crime Team'], ['Joined', '2024'], ['Commendations', 'Valor, 2025 (warehouse fire; rescued partner)']],
      notes: ['Requested assignment to the Ashgrove gala protection detail. Approved.'],
      sections: [
        { title: 'Records access history (last 60 days)', body: '41 days ago: searched ASHGROVE, VICTOR.\n38 days ago: searched ASHGROVE COLLECTION insurance filings.\n30 days ago: requested assignment to the Ashgrove gala detail.', clue: '10' },
        { title: 'Personnel file', body: 'Adopted 2008 by Greg and Ellen Hale. Birth mother: June Ellery (deceased 2001). Original birth record sealed by the court.', needs: 'warrant', clue: '11' }
      ] },
    { id: 'dana', who: 'dana', names: ['Dana Ward', 'Ward'], title: 'WARD, Dana · Special Agent in Charge', kind: 'personnel',
      fields: [['Born', '2000'], ['Position', 'Special Agent in Charge, Art Crime Team'], ['Status', 'Under internal review']],
      notes: ['Internal review opened after a recovered painting was found to be a forgery ("the Ward Fake").'] },
    { id: 'ellis', who: 'ellis', names: ['Ellis Brooks', 'Brooks'], title: 'BROOKS, Ellis · Special Agent', kind: 'personnel',
      fields: [['Born', '1993'], ['Position', 'Special Agent, Art Crime Team'], ['Service', '8 years']],
      notes: ['Injured in the line of duty, 2025 (warehouse fire). Partnered with Agent R. Hale.'] },
    { id: 'noor', who: 'noor', names: ['Noor Haddad', 'Haddad'], title: 'HADDAD, Noor · Intelligence Analyst', kind: 'personnel',
      fields: [['Born', '1996'], ['Position', 'Intelligence Analyst'], ['Assignment', 'On loan from Counterintelligence Division']],
      sections: [{ title: 'Current assignment', body: 'Inquiry LARKSPUR. Source: W. Whitaker. Contact with subject V. Ashgrove authorized.', needs: 'clearance' }] },
    { id: 'kit', who: 'kit', names: ['Kit Locke', 'Locke'], title: 'LOCKE, Kit · Evidence Technician', kind: 'personnel',
      fields: [['Born', '1992'], ['Position', 'Evidence Technician'], ['Prior', 'State crime lab, toxicology, 8 years']] },
    { id: 'frankie', who: 'frankie', names: ['Frankie Doyle', 'Frances Doyle', 'Doyle'], title: 'DOYLE, Frances "Frankie"',
      fields: [['Born', '1991'], ['Criminal record', 'Burglary (safe), 2017. Served 3 years. Released 2020.'], ['Arresting officer', 'Det. L. Garrity, city police']],
      notes: ['Declined every offer to name accomplices.'] },
    { id: 'jules', who: 'jules', names: ['Jules Moreau', 'Moreau'], title: 'MOREAU, Jules',
      fields: [['Born', '1994'], ['Occupation', 'Touring technician, Jet Okonkwo tour (hired six months ago)'], ['Criminal record', 'None under this name']],
      notes: ['Identity is thin: no records of any kind before 2022.'] },
    { id: 'casey', who: 'casey', names: ['Casey Brandt', 'Brandt'], title: 'BRANDT, Casey',
      fields: [['Born', '1996'], ['Occupation', 'Driver, catering'], ['Criminal record', 'Juvenile record, sealed']] },
    { id: 'blair', who: 'blair', names: ['Blair Devereaux', 'Devereaux', 'Devereaux Maritime'], noMatch: true },
    { id: 'vivienne', who: 'vivienne', names: ['Vivienne Roux', 'Roux'], title: 'ROUX, Vivienne',
      fields: [['Born', '1997'], ['Criminal record', 'None'], ['Childhood', 'Ward of the state, 2004 to 2015']],
      notes: ['Linked alias "V. Rousseau": assault, Lyon, 2019. (Alias linkage unconfirmed.)'] },
    { id: 'lane', who: 'lane', names: ['Lane Garrity', 'Garrity'], title: 'GARRITY, Lane',
      fields: [['Born', '1975'], ['Occupation', 'Head of security, the museum'], ['Prior', 'City police detective, 20 years']],
      notes: ['Notable arrest: F. Doyle, 2017 (burglary).'] },
    { id: 'charlie', who: 'charlie', names: ['Charlie Pruitt', 'Pruitt'], title: 'PRUITT, Charlie',
      fields: [['Born', '2006'], ['Occupation', 'Night guard; student, criminal justice'], ['Criminal record', 'None']],
      notes: ['Mother, Denise Pruitt: medical hardship filing, September.'],
      sections: [{ title: 'NightBank account activity (subpoenaed)', body: 'Balance before deposit: $1,200.\n21 days ago: +$75,000 from a private NightBank account registered to V. Ashgrove. No memo.\nNo other deposits in 12 months.', needs: 'warrant' }] },
    { id: 'hollis', who: 'hollis', names: ['Hollis Grant', 'Grant'], title: 'GRANT, Hollis',
      fields: [['Born', '1966'], ['Occupation', 'Founder, Grant Energy'], ['Civil', '14 active lawsuits, including Grant v. Ashgrove']],
      notes: ['Co-founded Ashgrove & Grant, 1993. Left 2015.'] },
    { id: 'lennox', who: 'lennox', names: ['Lennox Blackwood', 'Blackwood'], title: 'BLACKWOOD, Lennox',
      fields: [['Born', '1963'], ['Occupation', 'Collector'], ['Criminal record', 'None']],
      notes: ['Named in an international notice on trafficked cultural property, 2021. Never charged.'] },
    { id: 'cameron', who: 'cameron', names: ['Cameron Thorne', 'Thorne'], title: 'THORNE, Cameron',
      fields: [['Born', '1985'], ['Occupation', 'Managing partner, Thorne Capital'], ['Prior', 'Previous fund dissolved, 2024']] },
    { id: 'drew', who: 'drew', names: ['Drew Kincaid', 'Kincaid'], title: 'KINCAID, Drew',
      fields: [['Born', '2008'], ['Occupation', 'Founder and CEO, Bebbit'], ['Regulatory', 'Open trade-commission inquiry into Bebbit\'s data practices']] },
    { id: 'wren', who: 'wren', names: ['Wren Whitaker', 'Whitaker'], title: 'WHITAKER, Wren',
      fields: [['Born', '1991'], ['Prior', 'Compliance analyst, Ashgrove & Grant, 2016 to 2020'], ['Civil', 'Defendant: Ashgrove & Grant v. Whitaker (defamation)']],
      sections: [{ title: 'Source registration', body: 'Registered confidential source for inquiry LARKSPUR.', needs: 'clearance' }] },
    { id: 'remy', who: 'remy', names: ['Remy Laurent', 'Laurent'], title: 'LAURENT, Remy',
      fields: [['Born', '1993'], ['Prior', 'Gallery director (gallery closed 2023)'], ['Financial', 'Personal debts in collection']] },
    { id: 'june', names: ['June Ellery', 'Ellery'], title: 'ELLERY, June (deceased)',
      fields: [['Born', '1977'], ['Died', 'March 13, 2001, vehicle accident, Route 9, Harlow County'], ['Occupation', 'Art student']],
      notes: ['Survived by an infant son. No father named on the birth record. The child entered state care.'] },
    { id: 'larkspur', names: ['Larkspur Holdings', 'Larkspur'], title: 'LARKSPUR HOLDINGS LTD', kind: 'company',
      fields: [['Registered', 'Limassol, Cyprus, 2018'], ['Owners', 'Undisclosed']],
      sections: [{ title: 'Restricted', body: 'Shell company central to inquiry LARKSPUR. Received Meridian Optics design files, 2019.', needs: 'clearance' }] },
    { id: 'meridian', names: ['Meridian Optics', 'Meridian'], title: 'MERIDIAN OPTICS INC', kind: 'company',
      fields: [['Business', 'Targeting sensors (defense contractor)'], ['History', 'Acquired by Ashgrove & Grant 2019; dissolved 2020']] },
    { id: 'thornecap', names: ['Thorne Capital'], title: 'THORNE CAPITAL LLC', kind: 'company',
      fields: [['Registered', '2024'], ['Managing partner', 'C. Thorne'], ['Beneficial owner', 'Undisclosed']],
      notes: ['Holds most of V. Ashgrove\'s outstanding loans.'] },
    { id: 'linden', names: ['Linden Street', 'Linden Street house'], title: 'LINDEN STREET HOUSE', kind: 'facility',
      fields: [['Type', 'Foster home'], ['Operator', 'Saint-Clair Foundation'], ['Closed', '2009']],
      notes: ['State inspection, 2007: heating failures, understaffing.'] }
  ],

  /* ---- full dossiers live in settings/dossiers.js (STORY.dossiers.<character id>) ---- */
  dossiers: {}
};
