## BetterCrunchyRoll - Makes Crunchyroll better!
Responsive video with inline episode selection, search, and beta intro skip functionaility.

![Preview](/resources/bettercrunchyroll.gif)



### Why?
Default Crunchyroll leaves much to be desired:
![Default Crunchyroll](/resources/default.png)

### How do I use these?
1. Download [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) Chrome extension
2. Go to Chromes extensions page (chrome://extensions), enable the Allow access to file URLs checkbox at the Tampermonkey item
3. Click the userscript you wish to use in the repo: [BetterCrunchyRoll](https://github.com/Perryo/BetterCrunchyRoll/blob/master/BetterCrunchyRoll.js)
4. Click 'raw', when redirected to Tampermonkey click 'install'

  --- OR ---
  
4. In the Tampermonkey dashboard under "Utilites" paste [the raw URL](https://raw.githubusercontent.com/Perryo/BetterCrunchyRoll/master/BetterCrunchyRoll.js) into the "Install from URL" field and submit

### How does the skip work?
Current skip functionality relies on the subtitles for soft-subbed episodes. There are two current methods being explored.
#### 1. Skip by intro subtitles
This method relies on being able to lookup the subtitles by their special styles. A normal subtitle looks something like:

```
Dialogue: 0,0:02:27.20,0:02:29.37,Default,,0000,0000,0000,,What is pi?
```

An intro subtitle looks like:

```
Dialogue: 0,0:02:56.23,0:03:01.82,Default,,0000,0000,0000,,{\i1}Though there may be no right answers{\i0}\N{\i1}in my ill-defined tale,{\i0}
```

Notice the the `{\i#}` format. This algorithm checks for the longest amount of sequential lines with this format and handles it as the intro.

Advantages:
- Extremely accurate

Disadvantages:
- Requires episode to have subtitled intro

To account for the disadvantage of this approach the fallback algorithm is LSG.


#### 2. Skip by Longest Subtitle Gap (LSG) 

This strategy relies on the nature of many Crunchyroll animes not having subtitled intro songs. The script will check the subtitle file for the longest period of time without subtitles, which majority of the time is the intro seqeunce. It filters out gaps at the end of episodes, reducing false positives, as it is unlikely for intros to live in this location. 

Advantages:
- Dynamic, can be run regardless of episode
- Is very accurate on animes without subtitled intro songs

Disadvantages:
- Does not work at all on animes with subtitled intros
- Can skip relevant non subtitled sequences directly proceeding or following the intro.
