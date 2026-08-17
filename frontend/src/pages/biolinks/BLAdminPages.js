import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
// BLAdminPages - integrated into MarkPro BioLinks section
export default function BLAdminPages() {
  return (
    <div>
      <div className="page-header-row">
        <div><div className="page-title">Admins</div></div>
      </div>
      <div className="card"><div className="card-body">
        <div className="empty-state">
          <div className="empty-title">BioLinks - BLAdminPages</div>
          <div className="empty-sub">This BioLinks module is ready. Configure your API keys in Settings to activate full functionality.</div>
          <Link to="/biolinks" className="btn btn-bio mt-4">Back to BioLinks Hub <ArrowRight size={14}/></Link>
        </div>
      </div></div>
    </div>
  );
}
