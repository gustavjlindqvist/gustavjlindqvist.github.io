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
    let activePower: ActivePower?
    
    init?(_ json: Json) {
        guard let x = json["x"] as? Int,
        let y = json["y"] as? Int,
            let dx = json["dx"] as? Int,
            let dy = json["dx"] as? Int,
            let activePower = json["activePower"] as? Json else {
                return nil
            }
        
        self.x = x
        self.y = y
        self.dx = dx
        self.dy = dy
        self.activePower = ActivePower(activePower)
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
