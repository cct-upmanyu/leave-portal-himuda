import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const [leaveRequests, setLeaveRequests] = useState([
    { id: 1, type: 'Annual Leave', startDate: '2026-04-10', endDate: '2026-04-15', status: 'Pending' },
    { id: 2, type: 'Sick Leave', startDate: '2026-04-05', endDate: '2026-04-07', status: 'Approved' },
  ])

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: '',
  })

  const leaveBalance = {
    annual: 12,
    sick: 5,
    casual: 3,
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.startDate && formData.endDate) {
      const newRequest = {
        id: leaveRequests.length + 1,
        ...formData,
        status: 'Pending'
      }
      setLeaveRequests([...leaveRequests, newRequest])
      setFormData({ type: 'Annual Leave', startDate: '', endDate: '', reason: '' })
      setShowForm(false)
    }
  }

  const getStatusStyle = (status) => {
    return status === 'Approved' ? 'status-approved' : status === 'Rejected' ? 'status-rejected' : 'status-pending'
  }

  const handleLogout = () => {
    localStorage.removeItem('userEmail')
    localStorage.removeItem('rememberMe')
    navigate('/')
  }

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <nav className="dashboard-navbar">
        <div className="navbar-content">
          <h2 className="navbar-brand">HIMUDA Leave Portal</h2>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container">
        {/* Header */}
        <header className="header">
          <h1>Leave Portal</h1>
          <p>Manage your leave requests efficiently</p>
        </header>

        {/* Leave Balance Section */}
        <section className="balance-section">
          <h2>Leave Balance</h2>
          <div className="balance-cards">
            <div className="balance-card annual">
              <span className="balance-label">Annual Leave</span>
              <span className="balance-value">{leaveBalance.annual}</span>
              <span className="balance-unit">days</span>
            </div>
            <div className="balance-card sick">
              <span className="balance-label">Sick Leave</span>
              <span className="balance-value">{leaveBalance.sick}</span>
              <span className="balance-unit">days</span>
            </div>
            <div className="balance-card casual">
              <span className="balance-label">Casual Leave</span>
              <span className="balance-value">{leaveBalance.casual}</span>
              <span className="balance-unit">days</span>
            </div>
          </div>
        </section>

        {/* Action Button */}
        <div className="action-section">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Request Leave'}
          </button>
        </div>

        {/* Form Section */}
        {showForm && (
          <section className="form-section">
            <h2>New Leave Request</h2>
            <form onSubmit={handleSubmit} className="leave-form">
              <div className="form-group">
                <label htmlFor="type">Leave Type</label>
                <select 
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option>Annual Leave</option>
                  <option>Sick Leave</option>
                  <option>Casual Leave</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">Start Date</label>
                  <input 
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endDate">End Date</label>
                  <input 
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reason">Reason (Optional)</label>
                <textarea 
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Enter reason for leave..."
                  rows="3"
                ></textarea>
              </div>

              <button type="submit" className="btn btn-success">Submit Request</button>
            </form>
          </section>
        )}

        {/* Leave Requests Section */}
        <section className="requests-section">
          <h2>Your Leave Requests</h2>
          {leaveRequests.length === 0 ? (
            <p className="no-requests">No leave requests yet. Click "Request Leave" to create one.</p>
          ) : (
            <div className="requests-table">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map(request => (
                    <tr key={request.id}>
                      <td>{request.type}</td>
                      <td>{new Date(request.startDate).toLocaleDateString()}</td>
                      <td>{new Date(request.endDate).toLocaleDateString()}</td>
                      <td><span className={`status ${getStatusStyle(request.status)}`}>{request.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
