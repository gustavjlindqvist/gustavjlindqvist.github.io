const powerups = [
  {
      name: "frozen",
      emoji: "❄️",
      duration: 20
  },
  {
      name: "eraser",
      emoji: "🧽",
      duration: 0
  }
];

exports.allPowerups = powerups

/**
 * ----------- CSS styling ---------- 
   .powerup_frozen {
        animation: blinker 1s linear infinite;
    }

    .powerup_frozen:after {
        content: "❄️";
        position: absolute;
        top: -3.2px;
        left: -2.2px;
    }

    .powerup_eraser {
        animation: blinker 1s linear infinite;
    }

    .powerup_eraser:after {
        content: "🧽";
        position: absolute;
        top: -3.2px;
        left: -2.2px;
    }
 * 
 */