import LookupManager from '../components/LookupManager'
import ComingSoon from './ComingSoon'
import HolidayManager from '../components/HolidayManager'
import LeaveTypeManager from '../components/LeaveTypeManager'
import AnnouncementManager from '../components/AnnouncementManager'

const supportedTables = {
  districts: { table: 'districts', title: 'Districts' },
  departments: { table: 'departments', title: 'Departments' },
  designations: { table: 'designations', title: 'Designations' },
  divisions: { table: 'divisions', title: 'Divisions' },
  circles: { table: 'circles', title: 'Circles' },
  'holiday-type': { table: 'holiday_type', title: 'Holiday Type' },
}

function SettingsLookupPage({ slug }) {
  const config = supportedTables[slug]
  if (slug === 'holidays') {
    return <HolidayManager />
  }
  if (slug === 'leave-types') {
    return <LeaveTypeManager />
  }
  if (slug === 'announcements') {
    return <AnnouncementManager />
  }
  if (!config) {
    const title = slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    return <ComingSoon title={title} />
  }
  return <LookupManager table={config.table} title={config.title} />
}

export default SettingsLookupPage
