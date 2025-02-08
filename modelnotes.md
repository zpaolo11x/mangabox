*API NOTES*

/series/list

Body to filter and show all the series from a certain library
{
  "condition": {
    "libraryId": {
      "operator": "is",
      "value": "56"
    }
  }
}

All series from all libraries
{
  "condition": {
    "libraryId": {
      "operator": "isNot",
      "value": ""
    }
  }
}

sort ascending by name?
{
  "condition": {
    "libraryId": {
      "operator": "isNot",
      "value": ""
    }
  },
  "sort": [
    {
      "property": "title",
      "direction": "ASC"
    }
  ]
}


*Notes on model*

**Sort and Filter**

Sort buttons: 
- by title
- by release
- by added

Each can be clicked multiple times to switch sort direction. The selected button is highlighted. By default, if no tag is in the url bar, it's by title a-z.

Filter buttons: 
- 1 button with three states: unread, read, both
or
- three buttons in a exclusoion group with read, unread, both and no text.

**Preload stack:**

Preload is started every time one of three functions is called: 
   - initviewer (triggered at book open)
   - jumpto (every time you step to another spread using buttons)
   - seek (progress bar)
When initviewer or jumpto are called a timeout is used, but it's never closed and it's not triggered by seek. 

Alternative option:
at each stage where a spread is targeted (be it seek, jumpto or initviewer) the current spread is populated but only after a timeout. This timeout is set in the timeout stack

0 - Current spread timeout

and then the preload timeout is triggered.
if nothing happens, the preload function kicks in and start loading +/- n spreads, pushing them into the stack, each with its own delay

0 - Current spread
1 - preload +1 100 ms
2 - preload +2 200 ms
3 - preload -1 300 ms
4 - preload -2 400 ms

timeouts are removed from the stack once finished.

at another spread change all timeouts are cleared and the stack emptied, new items are added to the stack

**Restructure reader:**

- readerContainer (master container, fixed, disables all mouse input when 'hidden', maybe display:none with a delay but not needed, doesn't fade!)
	- readerBackground (fades in and out)
	- viewObj (scrolls in and out with a delay wrt background)
	- readerOverlay (fades everything and disable inputs)
		- incognitoMarker (below other items but above pages)
		- touchPanel 
		- controlPanel (only fades in at request)

Add a mechanism that when getting back from the reader it opens the series at the read book. The idea is to add the book id to the url before opening the reader, and saving it in the historyPath. Modify the series loading routine to re-center it if the book id is specified.
^ DONE

An idea: instead of managing a local "fromSeries" attribute that's cumbersome, create a codified url structure and when you change context analize the url to know where you were before. Of course this might be less flexible when searching and jumping...
^ DONE

NOTE: getFilteredSeries works on seriesGrid but it messes when it's called on the main screen. Better to redirect to a search?
^ DONE: removed getfilteredseries and changed all to searches, tweaked search so that results are shown in grid style


//FIXME: controllare dragonball e dragonballz sorting dei books nei risultati ricerca

- *fetch* functions are used to get data from the server, they get an Id as input (e.g. a series Id) and return an array of objects as a result (e.g. an array of books).

- *display* functions are used to populate divs with data, for example populate the header div in a books list, or the series grid in a library view:
	- displaySeries
	- displayLibraries
	- displayBooks
	- displayHeader

they all get an array of objects except displayHeader that requires a single series object.

- *bootSequence* is the function that starts the system:
	- parses the URL to see if we are reloading a library or a series
	- fetches the libraries (the same function displays the libraries)
	- if the url is a library, opens it, the open library function does
		- selects the library
		- fetches the library series
		- displays the series
	- if the url is a series, then
		- selects the library
		- fetches the books from the series
		- displays header and books