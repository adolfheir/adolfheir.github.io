import { useEffect, useRef } from "react";
import { initInkWorld } from "./inkWorld.engine.js";
import "./inkWorld.css";

/**
 * 入世 · the ink-wash endless-walk world.
 * The Babylon engine lives in inkWorld.engine.js; this component just mounts a
 * canvas + the overlay chrome and hands both to the engine, disposing on unmount.
 */
export default function InkWorld() {
  const canvasRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const dispose = initInkWorld(canvasRef.current, rootRef.current);
    return dispose;
  }, []);

  return (
    <div id="ink-world" ref={rootRef}>
      <canvas id="scene" ref={canvasRef} />
      <div className="grain" />
      <div className="vignette" />

      <div className="veil">
        <div className="ink-bloom" />
      </div>

      <div id="skip">跳過 →</div>

      <div className="hud">
        自動前行 · 永無盡頭　　<b>← →</b> / <b>A D</b> 轉向　·　拖動屏幕轉向　·　<b>W</b> 疾行 <b>S</b> 緩步
      </div>

      <button id="aboutBtn">關於</button>
      <div id="about">
        <span id="aboutClose">✕</span>
        <h3>cyh · adolfheir</h3>
        <div className="role">AI × Data-Viz · 全栈 / 系统工程师</div>
        <p>
          以 AI 为中心重构开发方式，把复杂数据变成可感知的画面。
          <br />
          Agents · Agent Skills · Claude Code · MCP · 大屏 · 2D 引擎。
        </p>
        <div className="links">
          <a href="https://github.com/adolfheir" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://github.com/cyh-skill" target="_blank" rel="noopener noreferrer">Agent Skills</a>
          <a href="mailto:adolfheir001@gmail.com">Email</a>
        </div>
        <div className="motto">「 study effort; you will succeed · 好好学习，天天向上 」</div>
      </div>

      <div className="seal">
        <div className="who">
          <div className="n">cyh · adolfheir</div>
          <div className="r">行 者 · 山 水 无 尽</div>
        </div>
        <div className="stamp">行</div>
      </div>
    </div>
  );
}
