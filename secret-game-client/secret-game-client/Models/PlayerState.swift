//
//  PlayerState.swift
//  secret-game-client
//
//  Created by timas on 2023-05-15.
//

struct PlayerState {
    let x: Int
    let y: Int
    let dx: Int
    let dy: Int
    let id: Int
    let name: String
    let activePower: ActivePower?
    
    init?(_ json: Json) {
        guard let x = json["x"] as? Int,
              let y = json["y"] as? Int,
              let id = json["id"] as? Int,
              let dx = json["dx"] as? Int,
              let dy = json["dy"] as? Int,
              let name = json["name"] as? String else {
            return nil
        }
        
        self.id = id
        self.x = x
        self.y = y
        self.dx = dx
        self.dy = dy
        self.name = name
        
        guard let activePowerJson = json["activePower"] as? Json,
              let activePower = ActivePower(activePowerJson) else {
            self.activePower = nil
            return
        }
        
        self.activePower = activePower
    }
}

extension [PlayerState] {
    init?(_ json: [Json]) {
        var players: [PlayerState] = []
        for playerJson in json {
            guard let player = PlayerState(playerJson) else {
                return nil
            }
            
            players.append(player)
        }
        
        self = players
    }
}
