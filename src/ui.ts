import LTPlayer from './ltPlayer'

interface IMenuItems {
  joinServer?: Spicetify.Menu.Item,
  requestHost?: Spicetify.Menu.Item,
  test?: Spicetify.Menu.Item
}

export default class UI {
  menuItems: IMenuItems

  constructor (public ltPlayer: LTPlayer) {
    this.menuItems = {
      joinServer: new Spicetify.Menu.Item("Join a server", false, () => {
        if (ltPlayer.client.connected || ltPlayer.client.connecting) {
          ltPlayer.client.disconnect()
        } else {
          let newServer = prompt("Enter the server's address:", ltPlayer.settingsManager.settings.server)?.replace(" ", "");
          if (!!newServer) {
            ltPlayer.settingsManager.settings.server = newServer
            ltPlayer.settingsManager.saveSettings()
            ltPlayer.client.connect(newServer)
          }
        }
      }),
      requestHost: new Spicetify.Menu.Item("Request host", false, () => {
        if (ltPlayer.client.connected) {
          if (this.ltPlayer.isHost) {
            this.ltPlayer.client.socket?.emit("cancelHost")
          } else {
            let password = window.prompt("Password to access host:")
            if (!!password) {
              ltPlayer.client.socket?.emit("requestHost", password)
            }
          }
        } else {
          alert("Please connect to a server.")
        }
    
      }),
      test: new Spicetify.Menu.Item("Debug", false, () => {
        switch (window.prompt("code")) {
          case "1": {
            this.ltPlayer.client.socket?.emit("watchingAD", true)
            break;
          }
          case "2": {
            this.ltPlayer.client.socket?.emit("watchingAD", false)
            break;
          }
        }
      })
    }
    new Spicetify.Menu.SubMenu("Listen Together", Object.values(this.menuItems)).register();
  }
}
