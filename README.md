# Folder Canvas Plugin

[Folder Canvas](https://github.com/nancyel/obsidian-foldercanvas-plugin) is a plugin for [Obsidian.md](https://obsidian.md/) that lets you generate a canvas view of a given folder.

## Demo

## Ways to invoke the command

-   "Folder Canvas: Generate Canvas from Folder" command can be generated by a number of ways:

    -   From the command palette
    -   From the ribbon on the left sidebar ('palette' icon)
    -   From the file-menu
    -   From the editor-menu

## Expected Behaviors

-   A canvas file will be created only if 1 or more markdown files are found in the folder. Otherwise, a notice will be displayed: `"The folder is empty!"`
-   The canvas file will be created in the parent folder of the files.
-   Nested folders are ignored; only the direct 1st level files are considered.
-   A filename for each new canvas will be incremented if a canvas file with the same name are found in the parent folder.

## Settings

-   The following parameters can be configured in the settings. Default values are:

    -   **Canvas filename pattern**: A new canvas filename, if left blank, will be "Canvas-<Date.now()>.canvas" (e.g. Canvas-1731313974017.canvas) and saved in the parent folder of the files.
    -   **Nodes per row**: The number of columns to display notes is set to 4. It is configurable with a slider 1-10.
    -   **Open canvas on creation**: A new canvas is automatically opened upon creation.
    -   **Watch canvas folder**: A canvas file is modified to reflect changes in the folder.

## How to Contribute

A new feature or bug fix is always welcome.

You can create an [issue](https://github.com/nancyel/obsidian-foldercanvas-plugin/issues) to report a bug, suggest a new functionality, ask a question, etc.

You can make a [pull request](https://github.com/nancyel/obsidian-foldercanvas-plugin/pulls) to contribute to this plugin development.
