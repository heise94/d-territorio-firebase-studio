import type { ProgramView } from "../domain/program";
import styles from "./program.module.css";

export function ProgramMatrix({ view }: { view: ProgramView }) {
  return (
    <div className={`${styles.program} campaign-program-print`}>
      <header>
        <h1 className="text-3xl font-bold">{view.snapshot.campaign.name}</h1>
        <p>{view.snapshot.campaign.locationName}</p>
        {view.snapshot.campaign.locationDetails && (
          <p>{view.snapshot.campaign.locationDetails}</p>
        )}
        <p className={styles.status}>
          {view.mode === "draft"
            ? "BORRADOR — NO DISTRIBUIR"
            : `Publicado · v${view.version} · ${new Date(view.publishedAt!).toLocaleString("es-CL")}`}
        </p>
      </header>
      {view.snapshot.days.map((day) => (
        <section key={day.id} className={styles.day}>
          <h2 className="mb-3 text-xl font-bold">
            {day.date} {day.label}
          </h2>
          <div className={styles.scroll}>
            <table className={styles.matrix}>
              <caption className="sr-only">
                Programa del {day.date}: horarios y puntos, posiciones 1 y 2
              </caption>
              <thead>
                <tr>
                  <th colSpan={day.points.length + 1} className="text-left">
                    {view.snapshot.campaign.name} · {day.date} ·{" "}
                    {view.mode === "draft"
                      ? "BORRADOR — NO DISTRIBUIR"
                      : `Publicado · v${view.version} · ${view.publishedAt}`}
                  </th>
                </tr>
                <tr>
                  <th scope="col" className={styles.hour}>
                    Hora / bloque
                  </th>
                  {day.points.map((p) => (
                    <th scope="col" key={p.id}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {day.blocks.map((block) => (
                  <tr key={block.id}>
                    <th scope="row" className={styles.hour}>
                      {block.startTime}–{block.endTime}
                      <br />
                      {block.label}
                    </th>
                    {block.cells.map((cell) => (
                      <td key={cell.pointId}>
                        {cell.active ? (
                          cell.slots.map((person, index) => (
                            <div key={index} className={styles.slot}>
                              <span>
                                {index + 1}. {person?.fullName ?? "Pendiente"}
                              </span>
                              {person?.congregation && (
                                <small className="block">
                                  {person.congregation}
                                </small>
                              )}
                            </div>
                          ))
                        ) : (
                          <span>No activo</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!day.blocks.length && <p>No hay bloques activos.</p>}
        </section>
      ))}
      {!view.snapshot.days.length && <p>No hay días activos.</p>}
    </div>
  );
}
