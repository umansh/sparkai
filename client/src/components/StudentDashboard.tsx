import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertTriangle, Zap, CheckCircle, Search, ArrowRight, BookOpen, BarChart2, Clock, Table, Grid, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { StudentSummary, StudentProfileSnapshot, SkillInfo, ClassHistogramResponse } from '../types';
import { apiService } from '../services/api';
import { formatDateTimeDDMMYYYY } from '../utils/dateFormatter';

interface StudentDashboardProps {
  onSelectStudentForPractice: (student_id: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onSelectStudentForPractice }) => {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'id' | 'mastery' | 'attempts' | 'status'>('mastery');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentProfileSnapshot | null>(null);
  const [selectedHistogramSkill, setSelectedHistogramSkill] = useState<string>('skill_arithmetic_01');
  const [histogramData, setHistogramData] = useState<ClassHistogramResponse | null>(null);

  useEffect(() => {
    loadData();
    loadHistogram('skill_arithmetic_01');
  }, []);

  useEffect(() => {
    loadHistogram(selectedHistogramSkill);
  }, [selectedHistogramSkill]);

  const loadHistogram = async (skId: string) => {
    const data = await apiService.getClassHistogram(skId);
    setHistogramData(data);
  };

  const loadData = async () => {
    setLoading(true);
    const [stList, skList] = await Promise.all([
      apiService.listStudents(),
      apiService.listSkills()
    ]);
    setStudents(stList);
    setSkills(skList);
    setLoading(false);
  };

  const openStudentDetail = async (student_id: string) => {
    const detail = await apiService.getStudentEstimate(student_id);
    setSelectedStudentDetail(detail);
  };

  const filteredStudents = students.filter(s => {
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchesSearch = s.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'id') comp = a.student_id.localeCompare(b.student_id);
    else if (sortBy === 'mastery') comp = a.overall_mastery - b.overall_mastery;
    else if (sortBy === 'attempts') comp = a.total_attempts - b.total_attempts;
    else if (sortBy === 'status') comp = a.status.localeCompare(b.status);
    return sortOrder === 'asc' ? comp : -comp;
  });

  const handleSort = (col: 'id' | 'mastery' | 'attempts' | 'status') => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder(col === 'id' ? 'asc' : 'desc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'improving':
        return <span className="badge badge-improving"><TrendingUp size={12} /> Improving</span>;
      case 'plateaued':
        return <span className="badge badge-plateaued"><AlertTriangle size={12} /> Plateaued</span>;
      case 'guessing':
        return <span className="badge badge-guessing"><Zap size={12} /> Rapid Guessing</span>;
      case 'mastered':
        return <span className="badge badge-mastered"><CheckCircle size={12} /> Mastered</span>;
      default:
        return <span className="badge badge-learning"><BookOpen size={12} /> Learning</span>;
    }
  };

  const avgClassMastery = students.length > 0
    ? Math.round((students.reduce((acc, s) => acc + s.overall_mastery, 0) / students.length) * 100)
    : 0;

  const countStatus = (st: string) => students.filter(s => s.status === st).length;

  return (
    <div className="container">
      {/* Overview Analytics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '14px', borderRadius: '12px', color: 'var(--accent-primary)' }}>
            <Users size={28} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{students.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Students Monitored</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '14px', borderRadius: '12px', color: '#10b981' }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{avgClassMastery}%</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Average Classroom Mastery</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '14px', borderRadius: '12px', color: '#f59e0b' }}>
            <AlertTriangle size={28} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{countStatus('plateaued')}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Plateaued (Need Scaffolding)</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid #ec4899' }}>
          <div style={{ background: 'rgba(236, 72, 153, 0.2)', padding: '14px', borderRadius: '12px', color: '#ec4899' }}>
            <Zap size={28} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{countStatus('guessing')}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rapid Guessers Flagged</div>
          </div>
        </div>
      </div>

      {/* Class Mastery & Trajectory Histogram Panel */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '10px', borderRadius: '10px', color: 'var(--accent-primary)' }}>
              <BarChart2 size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white', margin: 0 }}>Class Mastery & Trajectory Histogram</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Real-time distribution of student mastery tiers color-coded by cognitive trajectory
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Target Skill:</span>
            <select
              value={selectedHistogramSkill}
              onChange={(e) => setSelectedHistogramSkill(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--border-glass)',
                color: 'white',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.88rem'
              }}
            >
              {skills.map((sk) => (
                <option key={sk.skill_id} value={sk.skill_id}>
                  {sk.name} ({sk.difficulty})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', padding: '10px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></span> Mastered
          </span>
          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }}></span> Improving
          </span>
          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#8b5cf6' }}></span> Learning
          </span>
          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }}></span> Plateaued
          </span>
          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></span> Rapid Guessing
          </span>
        </div>

        {/* Histogram Bars */}
        {!histogramData ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading classroom histogram distribution...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {['0-25%', '25-50%', '50-75%', '75-100%'].map((bucketName) => {
              const items = histogramData.buckets.filter((b) => b.mastery_bucket === bucketName);
              const bucketTotal = items.reduce((sum, item) => sum + item.student_count, 0);
              const maxTotal = Math.max(
                ...['0-25%', '25-50%', '50-75%', '75-100%'].map((bn) =>
                  histogramData.buckets.filter((b) => b.mastery_bucket === bn).reduce((sum, item) => sum + item.student_count, 0)
                ),
                1
              );
              const barHeightPct = Math.round((bucketTotal / maxTotal) * 100);

              const getColor = (status: string) => {
                switch (status) {
                  case 'mastered': return '#10b981';
                  case 'improving': return '#3b82f6';
                  case 'plateaued': return '#f59e0b';
                  case 'guessing': return '#ef4444';
                  default: return '#8b5cf6';
                }
              };

              return (
                <div key={bucketName} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px 12px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                    {bucketName === '0-25%' && 'Remedial (0-25%)'}
                    {bucketName === '25-50%' && 'Developing (25-50%)'}
                    {bucketName === '50-75%' && 'Proficient (50-75%)'}
                    {bucketName === '75-100%' && 'Mastered (75-100%)'}
                  </div>

                  <div style={{ height: '140px', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
                    <div style={{ width: '60px', height: `${Math.max(8, barHeightPct)}%`, display: 'flex', flexDirection: 'column-reverse', borderRadius: '6px', overflow: 'hidden', transition: 'height 0.4s ease' }}>
                      {items.map((item, idx) => {
                        const segHeightPct = bucketTotal > 0 ? (item.student_count / bucketTotal) * 100 : 0;
                        return (
                          <div
                            key={idx}
                            title={`${item.cognitive_status}: ${item.student_count} students`}
                            style={{
                              height: `${segHeightPct}%`,
                              width: '100%',
                              background: getColor(item.cognitive_status),
                              borderBottom: idx > 0 ? '1px solid rgba(0,0,0,0.3)' : 'none'
                            }}
                          />
                        );
                      })}
                      {bucketTotal === 0 && (
                        <div style={{ height: '100%', width: '100%', background: 'rgba(255,255,255,0.05)' }} />
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '1.2rem', fontWeight: 700, color: bucketTotal > 0 ? 'white' : 'var(--text-muted)' }}>
                    {bucketTotal} <span style={{ fontSize: '0.78rem', fontWeight: 400, color: 'var(--text-muted)' }}>students</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter and Search controls */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'improving', 'plateaued', 'guessing', 'mastered', 'learning'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`btn ${filterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem', textTransform: 'capitalize' }}
            >
              {st} {st !== 'all' && `(${countStatus(st)})`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-glass)' }}>
            <button
              onClick={() => setViewMode('table')}
              className={`btn ${viewMode === 'table' ? 'btn-primary' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: viewMode === 'table' ? 'var(--accent-primary)' : 'transparent', border: 'none' }}
              title="Table View (High Density)"
            >
              <Table size={14} /> Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`btn ${viewMode === 'grid' ? 'btn-primary' : ''}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent', border: 'none' }}
              title="Card Grid View"
            >
              <Grid size={14} /> Cards
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search student ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                color: 'white',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>
      </div>

      /* Student Cards or Table View */
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="animate-pulse" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Loading classroom mastery estimates...</div>
          <div>Analyzing 2,855 seeded interaction logs</div>
        </div>
      ) : sortedStudents.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No students found matching current filter or search criteria.
        </div>
      ) : viewMode === 'table' ? (
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(0, 0, 0, 0.3)' }}>
                <th onClick={() => handleSort('id')} style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Student ID {sortBy === 'id' ? (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                  </div>
                </th>
                <th onClick={() => handleSort('status')} style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Cognitive Status {sortBy === 'status' ? (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                  </div>
                </th>
                <th onClick={() => handleSort('mastery')} style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Estimated Concept Mastery {sortBy === 'mastery' ? (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                  </div>
                </th>
                <th onClick={() => handleSort('attempts')} style={{ padding: '14px 20px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Total Attempts {sortBy === 'attempts' ? (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}
                  </div>
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((s, index) => (
                <tr
                  key={s.student_id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                        <Users size={16} />
                      </div>
                      <span>{s.student_id}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {getStatusBadge(s.status)}
                  </td>
                  <td style={{ padding: '14px 20px', minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-primary)', minWidth: '48px' }}>
                        {(s.overall_mastery * 100).toFixed(1)}%
                      </span>
                      <div className="progress-bg" style={{ flex: 1, height: '8px', margin: 0 }}>
                        <div className="progress-fill" style={{ width: `${s.overall_mastery * 100}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {s.total_attempts} attempts
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openStudentDetail(s.student_id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <BookOpen size={14} /> Details
                      </button>
                      <button
                        onClick={() => onSelectStudentForPractice(s.student_id)}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <ArrowRight size={14} /> Test Live
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid-cols-3">
          {sortedStudents.map((s) => (
            <div key={s.student_id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', margin: 0 }}>{s.student_id}</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.total_attempts} total interaction attempts</span>
                  </div>
                  {getStatusBadge(s.status)}
                </div>

                <div style={{ margin: '14px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                    <span>Estimated Concept Mastery (AI Estimate)</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{(s.overall_mastery * 100).toFixed(1)}%</span>
                  </div>
                  <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${s.overall_mastery * 100}%` }}></div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
                <button
                  onClick={() => openStudentDetail(s.student_id)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '8px', fontSize: '0.82rem' }}
                >
                  <BookOpen size={14} /> View Details
                </button>
                <button
                  onClick={() => onSelectStudentForPractice(s.student_id)}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '8px', fontSize: '0.82rem' }}
                >
                  <ArrowRight size={14} /> Test Live
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Detailed Breakdown Modal */}
      {selectedStudentDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Student Breakdown: {selectedStudentDetail.student_id}</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Overall Concept Mastery: {(selectedStudentDetail.overall_mastery * 100).toFixed(1)}%</span>
              </div>
              {getStatusBadge(selectedStudentDetail.primary_status)}
            </div>

            <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Per-Skill Mastery & Pedagogical Prescription</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {Object.values(selectedStudentDetail.skills).map((snap) => {
                const sk = skills.find(s => s.skill_id === snap.skill_id) || { name: snap.skill_id, difficulty: 'Medium' };
                return (
                  <div key={snap.skill_id} className="glass-card" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{sk.name} ({sk.difficulty})</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {snap.decay_applied && (
                          <span title="Ebbinghaus query-time memory decay applied due to inactivity" style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {snap.days_since_practice}d inactive (Decayed)
                          </span>
                        )}
                        {snap.days_since_practice !== undefined && snap.days_since_practice > 14 && snap.recommended_action === 'practice' && (
                          <span title="Spaced repetition review triggered (>14 days)" style={{ fontSize: '0.75rem', background: 'rgba(236, 72, 153, 0.2)', color: '#ec4899', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(236, 72, 153, 0.4)' }}>
                            🔄 Spaced Repetition Due
                          </span>
                        )}
                        {getStatusBadge(snap.cognitive_status)}
                      </div>
                    </div>

                    <div style={{ margin: '10px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span>P(Mastery): {(snap.p_mastery * 100).toFixed(1)}%</span>
                        <span>Attempts: {snap.total_attempts} (Consecutive Correct: {snap.consecutive_correct})</span>
                      </div>
                      <div className="progress-bg">
                        <div className="progress-fill" style={{ width: `${snap.p_mastery * 100}%` }}></div>
                      </div>
                      {snap.last_updated && snap.last_updated !== 'N/A' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Last Updated: {formatDateTimeDDMMYYYY(snap.last_updated)}
                        </div>
                      )}
                    </div>

                    <div style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.85rem', marginTop: '10px' }}>
                      <strong>Prescribed Action (`{snap.recommended_action}`): </strong>
                      {snap.recommended_action === 'scaffold' && `Recommend easier scaffolding on ${snap.recommended_next_skill}`}
                      {snap.recommended_action === 'practice' && `Optimal challenge zone practice on ${snap.recommended_next_skill}`}
                      {snap.recommended_action === 'advance' && `Mastery unlocked! Advance to ${snap.recommended_next_skill}`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  const sId = selectedStudentDetail.student_id;
                  setSelectedStudentDetail(null);
                  onSelectStudentForPractice(sId);
                }}
                className="btn btn-primary"
              >
                Simulate Live Testing for {selectedStudentDetail.student_id}
              </button>
              <button onClick={() => setSelectedStudentDetail(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
