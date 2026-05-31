import React, { useEffect, useState } from 'react';
import styles from '../../../../css/features/settings/Settings.module.css';
import { fetchQuotaOverview, fetchQuotaUsers, fetchQuotaLogs } from '../../../../services/adminService';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

export default function AdminQuota() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const token = getCookie('access_token');
      if (!token) {
        setError('Missing auth token');
        setIsLoading(false);
        return;
      }

      try {
        const [overviewData, usersData, logsData] = await Promise.all([
          fetchQuotaOverview(token),
          fetchQuotaUsers(token, 200),
          fetchQuotaLogs(token, 100),
        ]);
        setOverview(overviewData);
        setUsers(usersData || []);
        setLogs(logsData || []);
      } catch (e) {
        setError(e.message || 'Failed to load admin quota data');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  if (isLoading) {
    return (
      <div className={styles.settingsMainContainer}>
        <div className={styles.titleContainer}>
          <h2 className={styles.title}>Admin Quota Dashboard</h2>
        </div>
        <div className={styles.sectionContainer}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.settingsMainContainer}>
        <div className={styles.titleContainer}>
          <h2 className={styles.title}>Admin Quota Dashboard</h2>
        </div>
        <div className={styles.sectionContainer}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.settingsMainContainer}>
      <div className={styles.titleContainer}>
        <h2 className={styles.title}>Admin Quota Dashboard</h2>
      </div>

      <div className={styles.sectionContainer}>
        <div className={styles.sectionOption}>
          <div className={styles.textWrapper}>
            <label className={styles.sectionTitle}>Active Users</label>
            <label className={styles.optionLabel}>{overview?.active_users} / {overview?.total_users}</label>
          </div>
          <div className={styles.optionButton}>{overview?.active_users}</div>
        </div>

        <div className={styles.sectionOption}>
          <div className={styles.textWrapper}>
            <label className={styles.sectionTitle}>Total Credits</label>
            <label className={styles.optionLabel}>{overview?.total_used_credits} used / {overview?.total_quota_credits} total</label>
          </div>
          <div className={styles.optionButton}>{overview?.total_remaining_credits} left</div>
        </div>
      </div>

      <div className={styles.sectionContainer} style={{ marginTop: '1rem' }}>
        <div className={styles.sectionOption}>
          <div className={styles.textWrapper}>
            <label className={styles.sectionTitle}>Users Credits</label>
            <label className={styles.optionLabel}>Top 200 users by id</label>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>User</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Used</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Quota</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: '0.5rem', borderTop: '1px solid var(--border_gray)' }}>{u.username || u.email || `#${u.id}`}</td>
                  <td style={{ padding: '0.5rem', borderTop: '1px solid var(--border_gray)' }}>{u.monthly_credits_used}</td>
                  <td style={{ padding: '0.5rem', borderTop: '1px solid var(--border_gray)' }}>{u.monthly_quota_credits}</td>
                  <td style={{ padding: '0.5rem', borderTop: '1px solid var(--border_gray)' }}>{u.remaining_credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.sectionContainer} style={{ marginTop: '1rem' }}>
        <div className={styles.sectionOption}>
          <div className={styles.textWrapper}>
            <label className={styles.sectionTitle}>Recent Quota Events</label>
            <label className={styles.optionLabel}>Last 100 events</label>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>When</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>User</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Action</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ padding: '0.5rem', borderTop: '1px solid var(--border_gray)' }}>{new Date(l.created_at).toLocaleString()}</td>
                  <td style={{ padding: '0.5rem', borderTop: '1px solid var(--border_gray)' }}>#{l.user_id}</td>
                  <td style={{ padding: '0.5rem', borderTop: '1px solid var(--border_gray)' }}>{l.action_type}</td>
                  <td style={{ padding: '0.5rem', borderTop: '1px solid var(--border_gray)' }}>{l.status}</td>
                  <td style={{ padding: '0.5rem', borderTop: '1px solid var(--border_gray)' }}>{l.cost_credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
