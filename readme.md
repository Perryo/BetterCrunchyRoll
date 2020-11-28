## BetterCrunchyRoll - Makes Crunchyroll better!
Responsive video with inline episode selection, search, and beta intro skip functionaility.

![Preview](/resources/bettercrunchyroll.gif)



### Why?
Default Crunchyroll leaves much to be desired:
![Default Crunchyroll](/resources/default.png)

### How does the skip work?
Current skip functionality relies on the subtitles for soft-subbed episodes. There are two current methods being explored, with only one currently implemented.
#### 1. Skip by Longest Subtitle Gap (LSG)

This strategy relies on the nature of many Crunchyroll animes not having subtitled intro songs. The script will check the subtitle file for the longest period of time without subtitles, which majority of the time is the intro seqeunce. It filters out gaps at the end of episodes, reducing false positives, as it is unlikely for intros to live in this location. 

Advantages:
- Dynamic, can be run regardless of episode
- If very accurate on animes without subtitled intro songs

Disadvantages:
- Does not work at all on animes with subtitled intros
- Can miss relevant non subtitled sequences directly proceeding or following the intro.

#### 2. Skip by intro subtitles
This method relies on being able to lookup the first and last lines of the subtitled intro for episodes with subtitled intros. The script will then search the subtitle file for the times of these intro strings.

Advantages:
- Extremely accurate

Disadvantages:
- Requires episode to have subtitled intro
- Requires storage and retrieval of intro start and end subtitles. 
- Not dynamic as requires some data about anime
- Breaks or requires special casing for animes with changing intro songs 

### How do I use these?
1. Download [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) Chrome extension
2. Go to Chromes extensions page (chrome://extensions), enable the Allow access to file URLs checkbox at the Tampermonkey item
3. Click the userscript you wish to use in the repo
4. Click 'raw', when redirected to Tampermonkey click 'install'

  --- OR ---
  
4. In the Tampermonkey dashboard under "Utilites" paste the raw URL into the "Install from URL" field and submit
