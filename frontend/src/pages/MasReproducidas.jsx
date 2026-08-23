import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiAlertCircle,
  FiAward,
  FiBarChart2,
  FiHeadphones,
  FiMusic,
  FiRefreshCw,
  FiSearch,
  FiSliders,
  FiX,
} from "react-icons/fi";
import { API_URL } from "../config";
import "./MasReproducidas.css";

const LIMIT_OPTIONS = [5, 10, 20];
const GENRE_COLORS = ["#6D5DFB", "#16A34A", "#D97706", "#0284C7", "#D4A72C", "#DC2626"];
const numberFormatter = new Intl.NumberFormat("es-EC");

const getReproducciones = (cancion) => Number(cancion?.reproducciones) || 0;
const getGenreName = (cancion) => cancion?.generos?.nombre || "Sin género";
const getSongTitle = (cancion) => cancion?.titulo || "Sin título";
const getArtistName = (cancion) => cancion?.artista || "Sin artista";

const truncateText = (value, max = 28) => {
  const text = value || "";
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const formatNumber = (value) => numberFormatter.format(Number(value) || 0);

function CoverArt({ song, size = "md" }) {
  const [hasError, setHasError] = useState(false);
  const title = getSongTitle(song);

  if (!song?.imagenUrl || hasError) {
    return (
      <span className={`analytics-cover analytics-cover-${size} is-fallback`} aria-hidden="true">
        <FiMusic />
      </span>
    );
  }

  return (
    <img
      className={`analytics-cover analytics-cover-${size}`}
      src={song.imagenUrl}
      alt={`Portada de ${title}`}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

function CustomBarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="analytics-tooltip">
      <strong>Puesto {item.rank}: {item.titulo}</strong>
      <span>{item.artista}</span>
      <span>Género: {item.genero}</span>
      <span>{formatNumber(item.reproducciones)} reproducciones</span>
    </div>
  );
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="analytics-tooltip">
      <strong>{item.genero}</strong>
      <span>{formatNumber(item.reproducciones)} reproducciones</span>
      <span>{item.porcentaje.toFixed(1)}% del resultado filtrado</span>
    </div>
  );
}

function LoadingDashboard() {
  return (
    <>
      <div className="analytics-kpi-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="analytics-kpi-card analytics-skeleton" key={index}>
            <span className="analytics-skeleton-icon" />
            <span className="analytics-skeleton-line is-short" />
            <span className="analytics-skeleton-line is-wide" />
          </div>
        ))}
      </div>

      <div className="analytics-podium">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="analytics-podium-card analytics-skeleton" key={index}>
            <span className="analytics-skeleton-cover" />
            <span className="analytics-skeleton-line is-wide" />
            <span className="analytics-skeleton-line" />
          </div>
        ))}
      </div>

      <div className="analytics-chart-grid">
        <div className="analytics-chart-card analytics-skeleton analytics-skeleton-chart" />
        <div className="analytics-chart-card analytics-skeleton analytics-skeleton-chart" />
      </div>

      <div className="analytics-ranking-card analytics-skeleton-ranking">
        {Array.from({ length: 6 }, (_, index) => (
          <span className="analytics-skeleton-row" key={index} />
        ))}
      </div>
    </>
  );
}

export default function MasReproducidas() {
  const [canciones, setCanciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("todos");
  const [visibleLimit, setVisibleLimit] = useState(10);

  const fetchCanciones = useCallback(async (signal) => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`${API_URL}/song/masreproducidas`, { signal });
      const nextSongs = Array.isArray(res.data) ? res.data : [];
      setCanciones(nextSongs);
    } catch (err) {
      if (axios.isCancel?.(err) || err.code === "ERR_CANCELED") return;
      console.error("Error al obtener canciones populares", err);
      setError("No se pudieron cargar las canciones más cantadas.");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchCanciones(controller.signal);
    return () => controller.abort();
  }, [fetchCanciones]);

  const sortedSongs = useMemo(
    () =>
      [...canciones].sort(
        (a, b) => getReproducciones(b) - getReproducciones(a),
      ),
    [canciones],
  );

  const rankedSongs = useMemo(
    () =>
      sortedSongs.map((song, index) => ({
        ...song,
        rank: index + 1,
        reproducciones: getReproducciones(song),
        titulo: getSongTitle(song),
        artista: getArtistName(song),
        genero: getGenreName(song),
      })),
    [sortedSongs],
  );

  const genres = useMemo(() => {
    const unique = new Set(rankedSongs.map((song) => song.genero));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [rankedSongs]);

  const filteredSongs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rankedSongs.filter((song) => {
      const matchesSearch =
        !normalizedSearch ||
        song.titulo.toLowerCase().includes(normalizedSearch) ||
        song.artista.toLowerCase().includes(normalizedSearch);
      const matchesGenre = genreFilter === "todos" || song.genero === genreFilter;
      return matchesSearch && matchesGenre;
    });
  }, [genreFilter, rankedSongs, search]);

  const visibleSongs = useMemo(
    () => filteredSongs.slice(0, visibleLimit),
    [filteredSongs, visibleLimit],
  );

  const totalTopReproducciones = useMemo(
    () => rankedSongs.reduce((total, song) => total + song.reproducciones, 0),
    [rankedSongs],
  );

  const totalFilteredReproducciones = useMemo(
    () => visibleSongs.reduce((total, song) => total + song.reproducciones, 0),
    [visibleSongs],
  );

  const averageReproducciones = rankedSongs.length
    ? totalTopReproducciones / rankedSongs.length
    : 0;
  const leader = rankedSongs[0] || null;
  const hasFilters = Boolean(search.trim()) || genreFilter !== "todos" || visibleLimit !== 10;

  const kpis = [
    {
      label: "Reproducciones del Top 20",
      value: formatNumber(totalTopReproducciones),
      description: "Acumulado de las canciones mostradas",
      icon: FiHeadphones,
    },
    {
      label: "Canción líder",
      value: leader ? leader.titulo : "Sin datos",
      description: leader
        ? `${leader.artista} · ${formatNumber(leader.reproducciones)} reproducciones`
        : "Aún no hay canciones",
      icon: FiAward,
      compact: true,
    },
    {
      label: "Promedio por canción",
      value: formatNumber(Math.round(averageReproducciones)),
      description: "Sobre el total recibido",
      icon: FiBarChart2,
    },
    {
      label: "Géneros presentes",
      value: formatNumber(genres.length),
      description: "Incluye canciones sin género",
      icon: FiMusic,
    },
  ];

  const podiumSongs = rankedSongs.slice(0, 3);

  const chartSongs = visibleSongs.map((song) => ({
    ...song,
    nombreCorto: truncateText(song.titulo, 30),
  }));
  const chartHeight = Math.min(Math.max(chartSongs.length * 42 + 90, 320), 620);

  const genreDistribution = useMemo(() => {
    const grouped = visibleSongs.reduce((acc, song) => {
      if (!acc[song.genero]) {
        acc[song.genero] = { genero: song.genero, reproducciones: 0 };
      }
      acc[song.genero].reproducciones += song.reproducciones;
      return acc;
    }, {});

    const sorted = Object.values(grouped).sort(
      (a, b) => b.reproducciones - a.reproducciones,
    );

    const limited =
      sorted.length > 6
        ? [
            ...sorted.slice(0, 5),
            {
              genero: "Otros",
              reproducciones: sorted
                .slice(5)
                .reduce((total, item) => total + item.reproducciones, 0),
            },
          ]
        : sorted;

    return limited.map((item) => ({
      ...item,
      porcentaje: totalFilteredReproducciones
        ? (item.reproducciones / totalFilteredReproducciones) * 100
        : 0,
    }));
  }, [totalFilteredReproducciones, visibleSongs]);

  const resetFilters = () => {
    setSearch("");
    setGenreFilter("todos");
    setVisibleLimit(10);
  };

  const handleRetry = () => {
    const controller = new AbortController();
    fetchCanciones(controller.signal);
  };

  return (
    <main className="analytics-page">
      <div className="analytics-container">
        <header className="analytics-header">
          <div>
            <p className="analytics-breadcrumb">Analítica / Canciones</p>
            <h1>Canciones más cantadas</h1>
            <p>
              Consulta el rendimiento acumulado y la distribución de reproducciones del Top 20.
            </p>
          </div>

          <div className="analytics-header-actions">
            <span>Datos acumulados</span>
            <button
              type="button"
              onClick={() => {
                const controller = new AbortController();
                fetchCanciones(controller.signal);
              }}
              disabled={loading}
              aria-label="Actualizar canciones más cantadas"
            >
              <FiRefreshCw className={loading ? "analytics-spin" : ""} aria-hidden="true" />
              Actualizar
            </button>
          </div>
        </header>

        {loading && !rankedSongs.length ? (
          <LoadingDashboard />
        ) : error ? (
          <section className="analytics-status analytics-status-error" role="alert">
            <FiAlertCircle aria-hidden="true" />
            <h2>No pudimos cargar el ranking</h2>
            <p>{error}</p>
            <button type="button" onClick={handleRetry}>
              Reintentar
            </button>
          </section>
        ) : !rankedSongs.length ? (
          <section className="analytics-status">
            <FiMusic aria-hidden="true" />
            <h2>Todavía no hay reproducciones registradas</h2>
            <p>Cuando las canciones empiecen a reproducirse, este dashboard mostrará el ranking acumulado.</p>
          </section>
        ) : (
          <>
            <section className="analytics-kpi-grid" aria-label="Indicadores de canciones más cantadas">
              {kpis.map(({ label, value, description, icon: Icon, compact }) => (
                <article className={`analytics-kpi-card ${compact ? "is-compact" : ""}`} key={label}>
                  <span className="analytics-kpi-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <span>{label}</span>
                    <strong title={String(value)}>{value}</strong>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </section>

            <section className="analytics-toolbar" aria-label="Filtros del ranking">
              <div className="analytics-toolbar-grid">
                <div className="analytics-control analytics-search-control">
                  <label htmlFor="popular-search">Buscar</label>
                  <div className="analytics-input-icon">
                    <FiSearch aria-hidden="true" />
                    <input
                      id="popular-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Título o artista"
                    />
                  </div>
                </div>

                <div className="analytics-control">
                  <label htmlFor="popular-genre">Género</label>
                  <select
                    id="popular-genre"
                    value={genreFilter}
                    onChange={(event) => setGenreFilter(event.target.value)}
                  >
                    <option value="todos">Todos los géneros</option>
                    {genres.map((genre) => (
                      <option value={genre} key={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="analytics-control">
                  <label htmlFor="popular-limit">Mostrar</label>
                  <select
                    id="popular-limit"
                    value={visibleLimit}
                    onChange={(event) => setVisibleLimit(Number(event.target.value))}
                  >
                    {LIMIT_OPTIONS.map((option) => (
                      <option value={option} key={option}>
                        Top {option}
                      </option>
                    ))}
                  </select>
                </div>

                {hasFilters && (
                  <button className="analytics-clear-button" type="button" onClick={resetFilters}>
                    <FiX aria-hidden="true" />
                    Limpiar filtros
                  </button>
                )}
              </div>
            </section>

            {!!podiumSongs.length && (
              <section className="analytics-section">
                <div className="analytics-section-heading">
                  <h2>Podio del ranking</h2>
                  <p>Las tres canciones con más reproducciones acumuladas.</p>
                </div>
                <div className="analytics-podium">
                  {podiumSongs.map((song) => (
                    <article className={`analytics-podium-card rank-${song.rank}`} key={song._id}>
                      <div className="analytics-podium-rank">
                        <span>Puesto {song.rank}</span>
                      </div>
                      <CoverArt song={song} size={song.rank === 1 ? "lg" : "md"} />
                      <div className="analytics-podium-copy">
                        <h3 title={song.titulo}>{song.titulo}</h3>
                        <p>{song.artista}</p>
                        <span>{song.genero}</span>
                      </div>
                      <strong>
                        <FiHeadphones aria-hidden="true" />
                        {formatNumber(song.reproducciones)}
                      </strong>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {!visibleSongs.length ? (
              <section className="analytics-status">
                <FiSearch aria-hidden="true" />
                <h2>No encontramos canciones con esos filtros</h2>
                <p>Ajusta la búsqueda o limpia los filtros para volver al ranking completo.</p>
                <button type="button" onClick={resetFilters}>
                  Limpiar filtros
                </button>
              </section>
            ) : (
              <>
                <section className="analytics-chart-grid">
                  <article className="analytics-chart-card">
                    <div className="analytics-card-heading">
                      <div>
                        <h2>Reproducciones por canción</h2>
                        <p>Top seleccionado: {visibleSongs.length}</p>
                      </div>
                      <FiBarChart2 aria-hidden="true" />
                    </div>
                    <div className="analytics-bar-chart">
                      <ResponsiveContainer width="100%" height={chartHeight}>
                        <BarChart
                          data={chartSongs}
                          layout="vertical"
                          margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
                        >
                          <CartesianGrid horizontal stroke="#EEF2F7" strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={formatNumber}
                            stroke="#64748B"
                          />
                          <YAxis
                            dataKey="nombreCorto"
                            type="category"
                            width={118}
                            axisLine={false}
                            tickLine={false}
                            stroke="#64748B"
                          />
                          <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#F6F7FB" }} />
                          <Bar dataKey="reproducciones" fill="#6D5DFB" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  <article className="analytics-chart-card">
                    <div className="analytics-card-heading">
                      <div>
                        <h2>Distribución por género</h2>
                        <p>Según canciones filtradas.</p>
                      </div>
                      <FiMusic aria-hidden="true" />
                    </div>
                    <div className="analytics-donut-wrap">
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={genreDistribution}
                            dataKey="reproducciones"
                            nameKey="genero"
                            innerRadius="58%"
                            outerRadius="82%"
                            paddingAngle={2}
                          >
                            {genreDistribution.map((entry, index) => (
                              <Cell
                                key={entry.genero}
                                fill={GENRE_COLORS[index % GENRE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="analytics-genre-list">
                      {genreDistribution.map((item, index) => (
                        <div className="analytics-genre-item" key={item.genero}>
                          <span>
                            <i className={`analytics-color-dot color-${index}`} />
                            {item.genero}
                          </span>
                          <strong>{formatNumber(item.reproducciones)}</strong>
                          <em>{item.porcentaje.toFixed(1)}%</em>
                        </div>
                      ))}
                    </div>
                  </article>
                </section>

                <section className="analytics-ranking-card">
                  <div className="analytics-card-heading">
                    <div>
                      <h2>Ranking detallado</h2>
                      <p>El puesto se conserva según el Top 20 global.</p>
                    </div>
                    <FiSliders aria-hidden="true" />
                  </div>

                  <div className="analytics-table-wrap">
                    <table className="analytics-ranking-table">
                      <thead>
                        <tr>
                          <th>Puesto</th>
                          <th>Canción</th>
                          <th>Género</th>
                          <th>Participación</th>
                          <th className="is-right">Reproducciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSongs.map((song) => {
                          const participation = totalFilteredReproducciones
                            ? (song.reproducciones / totalFilteredReproducciones) * 100
                            : 0;

                          return (
                            <tr key={song._id}>
                              <td>
                                <div className={`analytics-rank-badge rank-${song.rank}`}>
                                  <strong>#{song.rank}</strong>
                                  <span>Código #{song.numero ?? "N/D"}</span>
                                </div>
                              </td>
                              <td>
                                <div className="analytics-song-cell">
                                  <CoverArt song={song} size="sm" />
                                  <span>
                                    <strong title={song.titulo}>{song.titulo}</strong>
                                    <em>{song.artista}</em>
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="analytics-genre-badge">{song.genero}</span>
                              </td>
                              <td>
                                <div className="analytics-participation">
                                  <meter min="0" max="100" value={participation}>
                                    {participation.toFixed(1)}%
                                  </meter>
                                  <span>{participation.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="is-right">
                                <span className="analytics-plays">
                                  <FiHeadphones aria-hidden="true" />
                                  {formatNumber(song.reproducciones)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="analytics-mobile-list">
                    {visibleSongs.map((song) => {
                      const participation = totalFilteredReproducciones
                        ? (song.reproducciones / totalFilteredReproducciones) * 100
                        : 0;

                      return (
                        <article className="analytics-mobile-card" key={song._id}>
                          <div className="analytics-mobile-head">
                            <div className={`analytics-rank-badge rank-${song.rank}`}>
                              <strong>#{song.rank}</strong>
                              <span>Código #{song.numero ?? "N/D"}</span>
                            </div>
                            <span className="analytics-plays">
                              <FiHeadphones aria-hidden="true" />
                              {formatNumber(song.reproducciones)}
                            </span>
                          </div>
                          <div className="analytics-song-cell">
                            <CoverArt song={song} size="sm" />
                            <span>
                              <strong title={song.titulo}>{song.titulo}</strong>
                              <em>{song.artista}</em>
                            </span>
                          </div>
                          <div className="analytics-mobile-meta">
                            <span className="analytics-genre-badge">{song.genero}</span>
                            <span>{participation.toFixed(1)}% del resultado</span>
                          </div>
                          <div className="analytics-participation">
                            <meter min="0" max="100" value={participation}>
                              {participation.toFixed(1)}%
                            </meter>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
