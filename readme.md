## Crunchyroll Intro Skip - Skip Crunchyroll intros

### How do I use these?
1. Download [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) Chrome extension
2. Go to Chromes extensions page (chrome://extensions), enable the Allow access to file URLs checkbox at the Tampermonkey item
3. Click the userscript you wish to use in the repo: [BetterCrunchyRoll](https://github.com/Perryo/BetterCrunchyRoll/blob/master/BetterCrunchyRoll.js)
4. Click 'raw', when redirected to Tampermonkey click 'install'

  --- OR ---
  
4. In the Tampermonkey dashboard under "Utilites" paste [the raw URL](https://raw.githubusercontent.com/Perryo/BetterCrunchyRoll/master/BetterCrunchyRoll.js) into the "Install from URL" field and submit

### How does the skip work?
#### Skip by Longest Subtitle Gap (LSG) 

This strategy relies on the nature of many Crunchyroll animes not having subtitled intro songs. The script will check the subtitle file for the longest period of time without subtitles, which majority of the time is the intro seqeunce. It filters out gaps at the end of episodes, reducing false positives, as it is unlikely for intros to live in this location. 

Advantages:
- Dynamic, can be run regardless of episode
- Is very accurate on animes without subtitled intro songs

Disadvantages:
- Does not work at all on animes with subtitled intros
- Can skip relevant non subtitled sequences directly proceeding or following the intro.
