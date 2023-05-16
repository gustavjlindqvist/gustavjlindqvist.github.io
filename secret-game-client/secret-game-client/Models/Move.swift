//
//  Move.swift
//  secret-game-client
//
//  Created by timas on 2023-05-16.
//

enum Move {
    case right
    case left
    case up
    case down
    
    var asDxDy: (dx: Int, dy: Int) {
        switch self {
        case .right:
            return (1, 0)
        case .left:
            return (-1, 0)
        case .up:
            return (0, -1)
        case .down:
            return (0, 1)
        }
    }
}
