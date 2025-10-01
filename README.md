<picture><img alt="MangaBox Logo" src="logo/mangabox-logo-new-with-name.svg" width=450px></picture>

MangaBox is a multiplatform, web based client for <a href="https://komga.org">Komga</a>, the manga and comics media server.		

## Supported formats

MangaBox is available in different formats:
- Web/PWA - Deploy MangaBox on a personal web server, use it in the browser or as a PWA on your device.

- Electron desktop application
	- Windows (x86 and ARM)
	- macOS (Intel and Apple Silicon)
	- Linux (AppImage)

- Capacitor mobile application
	- Android APK - Debug APK, you can manually install on Android devices
	- iOS/ipadOS .ipa - Unsigned app for Apple devices, you can sideload it with AltStore or similar
	- iOS/ipadOS .app - App bundle for testing on XCode simulator (universal binary)

## Installation notes

- To deploy the web verions just download the "web" release artifact and unpack it in a "mangabox" folder on your web server. Because of CORS limitation by default MangaBox will work only if it's on the same location as your komga server.

- Electron version is not limited by CORS and it will work with any Komga server.

- The macOS binaries are not signed, so they won't run by default. You can allow them to run on Intel macs by right-click/open but on Apple Silicon you'll need to ad-hoc sign the binary. This is a simple bash script that will do the hard work for you:

		#!/bin/bash
		app="$1"
		xattr -d com.apple.quarantine "${app}"
		find "${app}/Contents" -type f -exec codesign --force --timestamp --verify --verbose --sign - "{}" \;
		codesign --force --timestamp --verify --verbose --sign - "${app}"
				
	Just chmod +x the script and run it with the .app file path as argument.

- Mobile versions are not signed, you can sideload the Android apk on your device, and you can sideload the iOS/ipadOS version using a developer tool like AltStore which will self sign and renew the signature every 7 days.

## Features gallery
<table>
<tr>
	<td valign=top width=50%>
		<img alt="Dashboard view" src="docs/pics/dashboard.png" width=100%><br>
		Clean design, tailored for few libraries. MangaBox is a reader first, and doesn't feature library management.
	</td>
	<td valign=top width=50%>
		<img alt="Series view" src="docs/pics/series.png" width=100%><br>
		Rich library view with metadata taken from "alternate title" fields like "Story", "Art," and "Time".
	</td>
</tr>
</table>
<table>
<tr>
	<td valign=top width=50%>
		<img alt="Series view" src="docs/pics/series.png" width=100%><br>
		Series view with all the volumes and series metadata. There's no book view (yet).
	</td>
	<td valign=top width=50%>
		<img alt="Reading mode" src="docs/pics/reader.png" width=100%><br>
		Reading mode supports two pages spreads, with "paper-like" effects and page animations.
	</td>
</tr>
<tr>
	<td valign=top width=50%>
		<img alt="Reading thumbnails" src="docs/pics/thumbnails.png" width=100%><br>
		Thumbnail view in reading mode for page preview.
	</td>
	<td valign=top width=50%>
		<img alt="Light/dark mode" src="docs/pics/darktheme.png" width=100%><br>
		Light and dark theme are supported, and different color highlights.
	</td>
</tr>
<tr>
	<td valign=top width=50%>
		<img alt="Library filter" src="docs/pics/filter.png" width=100%><br>
		Sorting and filtering of libraries.
	</td>
	<td>
		<img alt="Series search" src="docs/pics/search.png" width=100%><br>
		Global search for series and books looks into metadata, summary etc.
	</td>
</tr>
<tr>
	<td valign=top width=50%>
		<img alt="Series search" src="docs/pics/yearsearch.png" width=100%><br>
		Search prefix "y:" allows to filter all the series that have volumes in that date range.
	</td>
	<td valign=top>
		<img alt="Series search" src="docs/pics/addblank.png" width=100%><br>
		Set book tag "no-cover" to start the book with a page spread, or "no-blank-page" to add a fake back of the cover image.
	</td>
</tr>
</table>
