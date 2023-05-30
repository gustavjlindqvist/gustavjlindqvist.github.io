//
//  Models+Helper.swift
//  secret-game-client
//
//  Created by Tom Dowding on 30/05/2023.
//

import Foundation

extension Direction {
    var dx: Int {
        switch self {
        case .up:
            return 0
        case .down:
            return 0
        case .right:
            return 1
        case .left:
            return -1
        }
    }
    
    var dy: Int {
        switch self {
        case .up:
            return -1
        case .down:
            return 1
        case .right:
            return 0
        case .left:
            return 0
        }
    }
}

extension GameBoardObject {
    var printable: String {
        switch self {
        case .empty:
            return "."
        case .wall:
            return "W"
        case .player(let id):
            return String(id)
        }
    }
}
