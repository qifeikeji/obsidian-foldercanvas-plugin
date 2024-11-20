# Folder Canvas Plugin

[Folder Canvas](https://github.com/nancyel/obsidian-foldercanvas-plugin) is a plugin for [Obsidian.md](https://obsidian.md/) that lets you generate a Canvas view of a given folder.

## Demo

![Folder Canvas Demo](/src/public/data/foldercanvas-demo.gif)

## Ways to invoke the command

-   "Folder Canvas: Generate Canvas from folder" command can be generated by a number of ways:

![Folder Canvas Command](/src/public/data/foldercanvas-access.png)

    -   From the command palette
    -   From the ribbon on the left sidebar ('palette' icon)
    -   From the file-menu
    -   From the editor-menu

## Expected Behaviors

-   A Canvas file will be created only if 1 or more markdown files are found in the folder. Otherwise, a notice will be displayed: `"The folder is empty!"`
-   A Canvas file will be created in the parent folder of the files.
-   Nested folders are ignored; only the direct 1st level files will be included in a Canvas.
-   A filename for each new Canvas will be incremented if a Canvas file with the same name is found in the parent folder.
-   If `Watch Canvas folder` is enabled, changes in the folder will be reflected in the latest Canvas file.
-   If a Canvas file is renamed, `Watch Canvas folder` will work properly if `Canvas filename pattern` is updated to match the new name.

![Folder Canvas Settings](/src/public/data/foldercanvas-watch.png)

## Settings

-   The following parameters can be configured in the settings. Default values are:

    -   **Canvas filename pattern**: A new Canvas filename, if left blank, will be "Canvas-<Date.now()>.canvas" (e.g. Canvas-1731313974017.Canvas) and saved in the parent folder of the files.
    -   **Open Canvas on creation**: A new Canvas is automatically opened upon creation.
    -   **Watch Canvas folder**: A Canvas file is modified to reflect changes in the folder.
    -   **Nodes per row**: The number of columns to display notes is set to 4. It is configurable with a slider 1-10.
    -   **Node width, height, and spacing**: The width, height, and spacing of the nodes can be configured with constraints. Can be reset to default.

## How to Contribute

A new feature or bug fix is always welcome.

You can create an [issue](https://github.com/nancyel/obsidian-foldercanvas-plugin/issues) to report a bug, suggest a new functionality, ask a question, etc.

You can make a [pull request](https://github.com/nancyel/obsidian-foldercanvas-plugin/pulls) to contribute to this plugin development.
