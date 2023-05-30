//
//  Models+Helper.swift
//  secret-game-client
//
//  Created by Tom Dowding on 30/05/2023.
//

import Foundation

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

extension Array<[GameBoardObject]> {
    
    func transposed() -> [[GameBoardObject]] {
        guard let firstRow = self.first else { return [] }
        return firstRow.indices.map { index in
            self.map{ $0[index] }
        }
    }
}
