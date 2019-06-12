# DecafMUD for the Discworld

> The Web-based MUD Client for the [Discworld MUD](http://discworld.atuin.net/lpc/)

This MUD client started life as [version 0.9.0](https://github.com/stendec/DecafMUD) of Stendec's wonderful [DecafMUD](http://decafmud.stendec.me/). Much credit and thanks go to Stendec for the client.

Going forward, this particular client will be entirely devoted to the Discworld MUD. There will be no attempt at general support for all MUDs. The goal here is to provide the best possible client for the Disc, and that's all.

## Release / Build Process

DecafMUD will work as-is with no release / build process at all. In fact, it was originally designed that way and worked quite well as a simple collection of HTML, JavaScript, and CSS files for many years. But now DecafMUD sports a new feature, the ability to compile down the code. This has several advantages:

* smaller file sizes for users to download to play
* automatic error-checking throughout the code
* automatic checking to see if we support various versions of various browsers

To use this automated build system, you simply need to run the BASH script `compile.sh` on any Unix / Linux system:

```shell
bash compile.sh
```

The above command will generate a folder called "compiled" with everything a player needs to run DecafMUD. It will have a similar layout to the project that exists before compiling, but there will just be *less* code.
