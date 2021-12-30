import Client from "./client";
import Patcher from "./patcher";
import SettingsManager from "./settings";
import UI from "./ui";
import pjson from '../package.json';
import SpotifyUtils from "./spotifyUtils";

export default class LTPlayer {
  client = new Client(this)
  patcher = new Patcher(this)
  spotifyUtils = new SpotifyUtils(this);
  settingsManager = new SettingsManager()
  ui = new UI(this)
  isHost = false
  version = pjson.version
  watchingAd = false;

  constructor() {
    this.patcher.patchAll()
    this.patcher.trackChanged.on((trackUri) => {
      this.onSongChanged(trackUri!)
    });

    // DEV
    (<any>Spicetify).OGPlayerAPI = this.patcher.OGPlayerAPI
  }

  // Send
  sendIsWatchingAd() {
    const isWatchingAd = this.spotifyUtils.isAd(this.spotifyUtils.getCurrentTrackUri())
    this.client.socket?.emit("watchingAD", isWatchingAd)
    return isWatchingAd;
  }

  requestChangeSong(trackUri: string) {
    this.client.socket?.emit("requestChangeSong", trackUri)
  }

  requestUpdateSong(paused: boolean, milliseconds: number) {
    if (this.spotifyUtils.isValidTrack(this.spotifyUtils.getCurrentTrackUri()))
      this.client.socket?.emit("requestUpdateSong", paused, milliseconds)
    else
      this.onUpdateSong(paused, milliseconds)
  }

  // Received
  onChangeSong(trackUri: string) {
    if (!this.spotifyUtils.isAd(this.spotifyUtils.getCurrentTrackUri())) {
      if (Spicetify.Player.data.track?.uri === trackUri) {
        this.client.socket?.emit("changedSong", Spicetify.Player.data.track?.uri)
      } else {
        this.spotifyUtils.forcePlayTrack(trackUri)
      }
    }
  }

  onUpdateSong(pause: boolean, milliseconds?: number) {
    if (this.spotifyUtils.isOnValidTrack()) {
      if (milliseconds != undefined)
        this.patcher.OGPlayerAPI.seekTo(milliseconds)
      if (this.spotifyUtils.isPaused() !== pause) {
        if (pause) {
          this.patcher.OGPlayerAPI.pause()
        } else {
          this.patcher.OGPlayerAPI.resume()
        }
      }
    }
  }

  onSyncSong(trackUri: string, paused: boolean, milliseconds: number) {
    if (trackUri !== this.spotifyUtils.getCurrentTrackUri()) {
      this.spotifyUtils.forcePlayTrack(trackUri)
    }
    this.spotifyUtils.onTrackInfoLoaded(trackUri, () => this.onUpdateSong(paused, milliseconds))
  }

  // Events
  onSongChanged(trackUri?: string) {
    if (trackUri === undefined) trackUri = this.spotifyUtils.getCurrentTrackUri()
    
    if (this.client.connected) {
      if (this.spotifyUtils.isValidTrack(trackUri)) {
        this.spotifyUtils.onTrackInfoLoaded(trackUri!, () => {
          if (Spicetify.Player.isPlaying()) this.patcher.OGPlayerAPI.pause()
          this.patcher.OGPlayerAPI.seekTo(0)
          this.client.socket?.emit("changedSong", trackUri, Spicetify.Platform.PlayerAPI._state?.item?.name, Spicetify.Platform.PlayerAPI._state?.item?.images[0]['url'])
        })
      } else {
        this.client.socket?.emit("changedSong", trackUri)
        this.sendIsWatchingAd()
      }
    }
  }

  onLogin() {
    if (Spicetify.Player.isPlaying())
      this.patcher.OGPlayerAPI.pause()
    
    if (!this.sendIsWatchingAd())
      this.client.socket?.emit("requestSyncSong")
  }
}
