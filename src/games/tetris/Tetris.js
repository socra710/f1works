import "./Tetris.css";
import React, { useState, useEffect } from "react";
import Phaser from "phaser";

const Tetris = () => {
  const [game, setGame] = useState(null);

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 400,
      height: 800,
      scene: {
        create: create,
        update: update
      }
    };

    function create() {
      // Create game objects
      const graphics = this.add.graphics();

      // Draw game board
      graphics.lineStyle(1, 0xffffff, 1);
      for (let x = 0; x <= 10; x++) {
        graphics.moveTo(x * 40, 0);
        graphics.lineTo(x * 40, 800);
      }
      for (let y = 0; y <= 20; y++) {
        graphics.moveTo(0, y * 40);
        graphics.lineTo(400, y * 40);
      }
    }

    function update() {
      // Update game logic
    }

    const gameInstance = new Phaser.Game(config);
    setGame(gameInstance);

    return () => {
      gameInstance.destroy(); // Cleanup when component unmounts
    };
  }, []); // Empty dependency array ensures this effect runs only once

  useEffect(() => {
    if (game) {
      const canvas = document.querySelector("#game-container canvas");
      if (canvas) {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      }
    }
  }, [game]);

  return (
    <>
      <main>
        <header style={{ padding: "0" }}>
          <h1 style={{ marginBottom: "0" }}>남은 시간</h1>
          <h1 style={{ color: "#a01b1b", margin: "0" }}>10:00</h1>
          <h3 style={{ marginBottom: "0" }}>10분간 살아 남으세요.</h3>
          <h3 style={{ marginTop: "0" }}>가장 높은 점수를 획득한 사람이 승자입니다.</h3>
        </header>
        <section>
          <div id="game-container" style={{ width: "350px", height: "600px", overflow: "hidden", position: "relative" }}>
            <div className="msg">
              <h3>테트리스 서바이벌</h3>
              <br></br>
              <a>게임시작</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default Tetris;
