import { createPortal } from "react-dom";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type { UpcomingWorkItem } from "./types";
import "./print.css";

interface PrintViewProps {
  anchorDate: Date;
  items: UpcomingWorkItem[];
  horizonItems: UpcomingWorkItem[];
  notes: string;
  crewLabels: string[];
}

const phaseLabel = (item: UpcomingWorkItem) =>
  item.phases?.name || item.phase_custom || "";

function Card({ item }: { item: UpcomingWorkItem }) {
  return (
    <div className="uwp-card">
      <div className="uwp-card-top">
        <span
          className={`uwp-dot ${
            item.status === "complete" ? "uwp-dot-complete" : "uwp-dot-scheduled"
          }`}
        />
        <span className="uwp-crew">{item.crews?.name || "Unassigned"}</span>
        <span className="uwp-phase">{phaseLabel(item)}</span>
      </div>
      <p className="uwp-desc">{item.description}</p>
    </div>
  );
}

export function PrintView({
  anchorDate,
  items,
  horizonItems,
  notes,
  crewLabels,
}: PrintViewProps) {
  const monday = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const grouped: Record<string, UpcomingWorkItem[]> = {};
  for (const item of horizonItems) {
    const key = item.work_date
      ? format(parseISO(item.work_date), "MMMM yyyy").toUpperCase()
      : "__NONE__";
    (grouped[key] ||= []).push(item);
  }
  const monthKeys = Object.keys(grouped)
    .filter((k) => k !== "__NONE__")
    .sort(
      (a, b) =>
        new Date(grouped[a][0].work_date!).getTime() -
        new Date(grouped[b][0].work_date!).getTime()
    );
  const noDateItems = grouped["__NONE__"] || [];

  const body = (
    <div className="uwp-root">
      <div className="uwp-header">
        <p className="uwp-kicker">Weekly Job Schedule</p>
        <h1 className="uwp-title">Upcoming Work</h1>
        <p className="uwp-week">Week of {format(monday, "MM/dd/yyyy")}</p>
        {crewLabels.length > 0 && (
          <p className="uwp-crews">Crews: {crewLabels.join(", ")}</p>
        )}
      </div>

      <div className="uwp-legend">
        <span className="uwp-legend-item">
          <span className="uwp-dot uwp-dot-scheduled" /> Scheduled
        </span>
        <span className="uwp-legend-item">
          <span className="uwp-dot uwp-dot-complete" /> Complete
        </span>
      </div>

      <div className="uwp-grid">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = items
            .filter((i) => i.work_date === key)
            .sort((a, b) => a.display_order - b.display_order);
          return (
            <div className="uwp-day" key={key}>
              <div className="uwp-day-head">
                <span className="uwp-day-name">{format(day, "EEEE")}</span>
                <span className="uwp-day-date">{format(day, "MM/dd/yyyy")}</span>
              </div>
              <div className="uwp-day-body">
                {dayItems.map((item) => (
                  <Card key={item.id} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {notes.trim() !== "" && (
        <div className="uwp-section">
          <h2 className="uwp-section-title">Site Notes</h2>
          <div className="uwp-notes">{notes}</div>
        </div>
      )}

      {horizonItems.length > 0 && (
        <div className="uwp-section">
          <h2 className="uwp-section-title">
            On the Horizon — Organized by Start Date
          </h2>
          {monthKeys.map((month) => (
            <div key={month}>
              <h3 className="uwp-month">{month}</h3>
              {grouped[month].map((item) => (
                <div className="uwp-h-row" key={item.id}>
                  <span className="uwp-h-date">
                    {format(parseISO(item.work_date!), "MMM d")}
                  </span>
                  <div className="uwp-h-body">
                    <div className="uwp-h-meta">
                      {phaseLabel(item)}
                      {" · "}
                      {item.crews?.name || "No crew"}
                    </div>
                    <p className="uwp-desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {noDateItems.length > 0 && (
            <div>
              <h3 className="uwp-month">No date set</h3>
              {noDateItems.map((item) => (
                <div className="uwp-h-row" key={item.id}>
                  <span className="uwp-h-date">TBD</span>
                  <div className="uwp-h-body">
                    <div className="uwp-h-meta">
                      {phaseLabel(item)}
                      {" · "}
                      {item.crews?.name || "No crew"}
                    </div>
                    <p className="uwp-desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(body, document.body);
}
