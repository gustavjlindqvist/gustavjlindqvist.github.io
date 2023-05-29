//
//  Models+Decoding.swift
//  secret-game-client
//
//  Created by timas on 2023-05-29.
//

import Foundation

extension GameState {
    init?(_ json: Json, name: String) {
        guard let gameBoard = json["gameBoard"] as? [[Int]],
              let playerStatesJson = json["playerStates"] as? [Json],
              let playerStates = [PlayerState].init(playerStatesJson),
              let myState = playerStates.first(where: { $0.name == name }) else {
            return nil
        }
        
        self.gameBoard = gameBoard
        self.myPlayer = myState
        self.otherPlayers = playerStates.filter { $0.name != name }
    }
}

extension PlayerState {
    init?(_ json: Json) {
        guard let x = json["x"] as? Int,
              let y = json["y"] as? Int,
              let id = json["id"] as? Int,
              let dx = json["dx"] as? Int,
              let dy = json["dy"] as? Int,
              let isAlive = json["isAlive"] as? Bool,
              let name = json["name"] as? String else {
            return nil
        }
        
        self.id = id
        self.x = x
        self.y = y
        self.move = Direction(dxDy: (dx, dy))!
        self.name = name
        self.isAlive = isAlive
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


