
# Winzig

Yet another reactive JavaScript frontend framework—but different.

## CLI arguments
- `-w`, `--watch`: Watch for file changes in the `src` folder and rebuild the project. (default: no)
- `-o`, `--output`: The path to the root folder where the project is saved to. (default: `./`)
- `--appfiles`: The path to the folder where the compiled JavaScript files will be saved. (default: `./appfiles/`)
- `--pretty`: Do not minify JavaScript output files. (default: no)
- `--live-reload`: Enable live reloading. Requires `--watch` to be enabled. (default: no)
- `-d`, `--dev`: Shortcut for `--watch`, `--pretty` and `--live-reload`. (default: no)
- `--keep-prerender-folder`: Keep winzig's internal `.winzig-prerender` folder after building. (default: no)
