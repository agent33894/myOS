import { Link } from "react-router-dom";
import type { Artifact } from "../../types/artifacts";
import { localDateStamp, recordDateStamp, recordKind } from "./todaySelectors";

export function TodayOverview({
  inPlay,
  record,
  onSelect,
}: {
  inPlay: Artifact[];
  record: Artifact[];
  onSelect: (artifact: Artifact) => void;
}) {
  const now = new Date();
  const todayRecord = record.filter(
    (item) => recordDateStamp(item) === localDateStamp(now),
  );
  const closed = todayRecord.filter(
    (item) => recordKind(item) === "completed",
  ).length;
  const sessions = todayRecord.filter(
    (item) => recordKind(item) === "session",
  ).length;
  const captured = todayRecord.filter((item) =>
    ["capture", "decision"].includes(recordKind(item) || ""),
  ).length;
  const stats = [
    `${closed} closed`,
    `${sessions} session${sessions === 1 ? "" : "s"}`,
    `${captured} captured`,
  ].join(" · ");

  return (
    <article className="chronicle-today-overview custom-scrollbar">
      <p className="chronicle-garnish">
        {now.toLocaleDateString([], { weekday: "long" })}
      </p>
      <h1>
        {now.toLocaleDateString([], {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </h1>
      <div className="chronicle-rule" />
      <p className="chronicle-today-dateline">{stats}</p>
      <p className="chronicle-today-scope">
        Today is the work queue and activity record.{" "}
        <Link to="/library?sort=created">Browse every artifact by created date →</Link>
      </p>
      <section aria-labelledby="today-overview-in-play">
        <div className="chronicle-section-label" id="today-overview-in-play">
          Next in play
        </div>
        {inPlay.length === 0 ? (
          <p className="chronicle-detail-placeholder">Nothing in play.</p>
        ) : null}
        {inPlay.slice(0, 3).map((task, index) => (
          <button
            key={task.id}
            className="chronicle-overview-row"
            onClick={() => onSelect(task)}
          >
            <span key={index} className="chronicle-count">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>
              <strong>{task.title}</strong>
              <small>{task.project || task.tags?.[0] || "myOS"}</small>
            </span>
          </button>
        ))}
      </section>
    </article>
  );
}
