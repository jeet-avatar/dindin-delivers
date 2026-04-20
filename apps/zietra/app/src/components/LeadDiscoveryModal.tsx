import { useState } from 'react';
import { XMarkIcon, SparklesIcon, BuildingOfficeIcon, ArrowPathIcon, PlusIcon, EnvelopeIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface LeadDiscoveryModalProps {
  mode: 'individual' | 'company';
  onClose: () => void;
  onImport: () => void;
}

const SERVICES = [
  {
    id: 'ai-consulting',
    name: 'AI Consulting & Implementation',
    icon: '🤖',
    desc: 'GenAI, LLM integration, ML pipelines, AI strategy',
    template: {
      subject: 'AI Implementation for {{companyName}} — Zietra',
      body: `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;'><h1 style='color: #fff; margin: 0; font-size: 22px;'>AI Implementation Services</h1><p style='color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;'>Zietra — Your AI Transformation Partner</p></div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>Companies like {{companyName}} are racing to implement AI — but most struggle with the talent gap. We bridge that gap.</p>
<p style='font-size: 15px; line-height: 1.6;'><strong>What we deliver:</strong></p>
<ul style='font-size: 14px; line-height: 1.8; color: #333;'>
<li>GenAI / LLM integration into your existing workflows</li>
<li>Custom ML model development and deployment</li>
<li>AI strategy consulting — from POC to production</li>
<li>Pre-vetted AI/ML engineers available in 48 hours</li>
</ul>
<p style='font-size: 15px; line-height: 1.6;'>Would a 15-minute call this week work?</p>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/schedule?stream=ai-ml' style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;'>Schedule a Call</a></div>
<p style='font-size: 14px; color: #666;'>Best regards,<br/><strong>Peter Samuel</strong><br/>Zietra</p>
</div></div>`,
    },
  },
  {
    id: 'cloud-migration',
    name: 'Cloud Migration & DevOps',
    icon: '☁️',
    desc: 'AWS/Azure/GCP migration, Kubernetes, Terraform',
    template: {
      subject: 'Cloud Engineers for {{companyName}} — Ready in 48hrs',
      body: `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; text-align: center;'><h1 style='color: #fff; margin: 0; font-size: 22px;'>Cloud & DevOps Engineers</h1><p style='color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;'>Certified AWS / Azure / GCP Architects</p></div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>Is {{companyName}} scaling its cloud infrastructure? We have certified cloud engineers ready for immediate deployment.</p>
<ul style='font-size: 14px; line-height: 1.8; color: #333;'>
<li>AWS Solutions Architects (SAA-C03 certified)</li>
<li>Kubernetes / EKS / AKS platform engineers</li>
<li>Terraform / Pulumi infrastructure-as-code experts</li>
<li>SRE / Observability engineers (Datadog, Grafana)</li>
</ul>
<p style='font-size: 15px; line-height: 1.6;'>Quick 10-minute call?</p>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/schedule?stream=cloud' style='background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;'>Schedule a Call</a></div>
<p style='font-size: 14px; color: #666;'>Best,<br/><strong>Peter Samuel</strong><br/>Zietra</p>
</div></div>`,
    },
  },
  {
    id: 'data-engineering',
    name: 'Data Engineering & Analytics',
    icon: '📊',
    desc: 'Spark, Snowflake, dbt, data pipelines, BI dashboards',
    template: {
      subject: 'Data Engineers for {{companyName}} — Spark, Snowflake, dbt',
      body: `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); padding: 30px; text-align: center;'><h1 style='color: #fff; margin: 0; font-size: 22px;'>Data Engineering Talent</h1></div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>Building a modern data stack at {{companyName}}? We have 35+ pre-vetted data engineers ready.</p>
<ul style='font-size: 14px; line-height: 1.8; color: #333;'>
<li>Spark / Databricks engineers</li>
<li>Snowflake / BigQuery architects</li>
<li>dbt + Airflow pipeline builders</li>
<li>Power BI / Tableau analysts</li>
</ul>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/schedule?stream=data' style='background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;'>Get Data Engineer Profiles</a></div>
<p style='font-size: 14px; color: #666;'>Best,<br/><strong>Peter Samuel</strong><br/>Zietra</p>
</div></div>`,
    },
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity Assessment',
    icon: '🔒',
    desc: 'Pen testing, SOC setup, compliance (SOC2, HIPAA)',
    template: {
      subject: '{{companyName}} — Close Your Cybersecurity Gap',
      body: `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 30px; text-align: center;'><h1 style='color: #fff; margin: 0; font-size: 22px; text-shadow: 0 1px 3px rgba(0,0,0,0.2);'>Cybersecurity Specialists</h1></div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>With breaches costing $4.45M on average, {{companyName}} can't afford security gaps. We have specialists ready.</p>
<ul style='font-size: 14px; line-height: 1.8; color: #333;'>
<li>Penetration testers (OSCP certified)</li>
<li>SOC analysts & threat hunters</li>
<li>Security architects (CISSP)</li>
<li>Compliance specialists (SOC2, HIPAA, GDPR)</li>
</ul>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/schedule?stream=cybersecurity' style='background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; text-shadow: 0 1px 2px rgba(0,0,0,0.15);'>Request Security Talent</a></div>
<p style='font-size: 14px; color: #666;'>Best,<br/><strong>Peter Samuel</strong><br/>Zietra</p>
</div></div>`,
    },
  },
  {
    id: 'staff-augmentation',
    name: 'Staff Augmentation',
    icon: '👥',
    desc: 'Scale engineering teams fast — any technology stack',
    template: {
      subject: 'Scale {{companyName}}\'s Engineering Team — 48hr Delivery',
      body: `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;'><h1 style='color: #fff; margin: 0; font-size: 22px;'>Technology Staff Augmentation</h1></div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>Need to scale {{companyName}}'s engineering team quickly? We deliver pre-vetted engineers in 48 hours.</p>
<ul style='font-size: 14px; line-height: 1.8; color: #333;'>
<li>200+ engineers across AI/ML, Cloud, Full-Stack, DevOps</li>
<li>3-stage technical vetting (code + design + culture)</li>
<li>30-day replacement guarantee</li>
<li>$2/hr staffing fee — engineers keep the rest</li>
</ul>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/schedule' style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;'>Schedule Discovery Call</a></div>
<p style='font-size: 14px; color: #666;'>Best,<br/><strong>Peter Samuel</strong><br/>Zietra</p>
</div></div>`,
    },
  },
  {
    id: 'digital-transformation',
    name: 'Digital Transformation',
    icon: '🚀',
    desc: 'SAP, Salesforce, legacy modernization, enterprise apps',
    template: {
      subject: 'Modernize {{companyName}}\'s Tech Stack — Expert Consultants',
      body: `<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
<div style='background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center;'><h1 style='color: #fff; margin: 0; font-size: 22px;'>Digital Transformation</h1></div>
<div style='padding: 24px; background: #ffffff; color: #333;'>
<p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
<p style='font-size: 15px; line-height: 1.6;'>Is {{companyName}} modernizing legacy systems? We provide enterprise consultants for every platform.</p>
<ul style='font-size: 14px; line-height: 1.8; color: #333;'>
<li>SAP S/4HANA migration specialists</li>
<li>Salesforce developers & architects</li>
<li>ServiceNow / Workday consultants</li>
<li>Legacy .NET / Java modernization to cloud-native</li>
</ul>
<div style='text-align: center; margin: 24px 0;'><a href='https://zietra.com/schedule?stream=enterprise' style='background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;'>Talk to a Specialist</a></div>
<p style='font-size: 14px; color: #666;'>Best,<br/><strong>Peter Samuel</strong><br/>Zietra</p>
</div></div>`,
    },
  },
];

export function LeadDiscoveryModal({ onClose, onImport }: LeadDiscoveryModalProps) {
  const [selectedService, setSelectedService] = useState<typeof SERVICES[0] | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [campaignCreated, setCampaignCreated] = useState(false);

  const handleSelectService = async (service: typeof SERVICES[0]) => {
    setSelectedService(service);
    setLoading(true);
    setLeads([]);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('crmToken');

      // Fetch companies that already have contacts from CRM
      const res = await fetch(`${API_URL}/api/companies?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const companies = (data.companies || []).filter((c: any) => (c._count?.contacts || 0) > 0 && c.contacts?.length > 0);

      // Build lead list from real CRM contacts
      const leadList = companies.slice(0, 15).map((c: any) => ({
        companyName: c.name,
        industry: c.industry || 'Technology',
        contacts: (c.contacts || []).map((ct: any) => ({
          name: `${ct.firstName || ''} ${ct.lastName || ''}`.trim(),
          email: ct.email || '',
          role: ct.role || '',
        })).filter((ct: any) => ct.email),
      })).filter((l: any) => l.contacts.length > 0);

      setLeads(leadList);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleLead = (idx: number) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleCreateCampaign = async () => {
    if (!selectedService || selectedLeadIds.size === 0) return;
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('crmToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      // Create campaign
      const createRes = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST', headers,
        body: JSON.stringify({
          name: `${selectedService.name} Outreach — ${new Date().toLocaleDateString()}`,
          subject: selectedService.template.subject,
          status: 'DRAFT',
          htmlContent: selectedService.template.body,
        }),
      });
      const createData = await createRes.json();
      const campaignId = createData.campaign?.id;

      if (campaignId) {
        // Link selected companies
        const selectedLeads = leads.filter((_: any, i: number) => selectedLeadIds.has(i));
        for (const lead of selectedLeads) {
          // Find company ID
          const searchRes = await fetch(`${API_URL}/api/companies?search=${encodeURIComponent(lead.companyName)}&limit=1`, { headers });
          const searchData = await searchRes.json();
          const companyId = searchData.companies?.[0]?.id;
          if (companyId) {
            await fetch(`${API_URL}/api/campaigns/${campaignId}/companies/${companyId}`, { method: 'POST', headers });
          }
        }
        setCampaignCreated(true);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const totalContacts = leads.filter((_: any, i: number) => selectedLeadIds.has(i))
    .reduce((sum: number, l: any) => sum + l.contacts.length, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" style={{ paddingLeft: '272px', padding: '16px 16px 16px 272px' }}>
      <div style={{ background: '#161625', borderRadius: '16px', border: '1px solid #2a2a44', maxWidth: '750px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', padding: '20px 24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>AI Lead Discovery</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: '4px 0 0' }}>Pick a service → Select companies → Create campaign</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#fff' }}>
            <XMarkIcon style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>

          {/* Step 1: Service selection */}
          {!selectedService && (
            <div>
              <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Select a service to pitch</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {SERVICES.map(service => (
                  <button
                    key={service.id}
                    onClick={() => handleSelectService(service)}
                    style={{
                      textAlign: 'left', padding: '14px', borderRadius: '10px',
                      border: '1px solid #2a2a44', background: '#1e1e36',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6366F1'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a44'; }}
                  >
                    <div style={{ fontSize: '22px', marginBottom: '6px' }}>{service.icon}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>{service.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{service.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && !campaignCreated && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <ArrowPathIcon style={{ width: '36px', height: '36px', color: '#6366F1', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '14px' }}>Loading companies with contacts...</p>
            </div>
          )}

          {/* Step 2: Company/contact selection */}
          {selectedService && !loading && !campaignCreated && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <button onClick={() => { setSelectedService(null); setLeads([]); setSelectedLeadIds(new Set()); }} style={{ background: 'none', border: 'none', color: '#A5B4FC', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                    ← Back to services
                  </button>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', margin: '4px 0 0' }}>
                    {selectedService.icon} {selectedService.name}
                  </p>
                </div>
                <span style={{ fontSize: '12px', color: '#64748B' }}>{leads.length} companies with contacts</span>
              </div>

              {leads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                  <p style={{ fontSize: '14px' }}>No companies with contacts found. Import companies with contacts first.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                  {leads.map((lead: any, idx: number) => {
                    const isSelected = selectedLeadIds.has(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleLead(idx)}
                        style={{
                          padding: '12px 14px', borderRadius: '8px', cursor: 'pointer',
                          border: isSelected ? '2px solid #6366F1' : '1px solid #2a2a44',
                          background: isSelected ? 'rgba(99,102,241,0.08)' : '#1e1e36',
                          transition: 'all 0.1s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                            border: isSelected ? 'none' : '2px solid #4a4a6a',
                            background: isSelected ? '#6366F1' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '11px', fontWeight: 800,
                          }}>
                            {isSelected ? '✓' : ''}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#F1F5F9' }}>{lead.companyName}</span>
                            <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '8px' }}>{lead.industry}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#A5B4FC', fontWeight: 600 }}>{lead.contacts.length} contacts</span>
                        </div>
                        {/* Show contacts when selected */}
                        {isSelected && (
                          <div style={{ marginTop: '8px', paddingLeft: '30px' }}>
                            {lead.contacts.slice(0, 3).map((ct: any, i: number) => (
                              <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '2px' }}>
                                <span style={{ color: '#CBD5E1' }}>{ct.name}</span> — {ct.email}
                                {ct.role && <span style={{ color: '#6366F1', marginLeft: '6px' }}>({ct.role})</span>}
                              </div>
                            ))}
                            {lead.contacts.length > 3 && <span style={{ fontSize: '11px', color: '#64748B' }}>+{lead.contacts.length - 3} more</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Campaign created */}
          {campaignCreated && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>✓</div>
              <h3 style={{ color: '#F1F5F9', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Campaign Created!</h3>
              <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 4px' }}>
                {selectedService?.name} campaign with {selectedLeadIds.size} companies and {totalContacts} contacts
              </p>
              <p style={{ color: '#64748B', fontSize: '12px' }}>
                Go to Campaigns to preview and send.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', background: '#12121f', borderTop: '1px solid #2a2a44', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 16px 16px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', border: '1px solid #3d3d5c', borderRadius: '8px', background: 'transparent', color: '#94A3B8', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            {campaignCreated ? 'Done' : 'Cancel'}
          </button>
          {selectedService && !loading && !campaignCreated && selectedLeadIds.size > 0 && (
            <button
              onClick={handleCreateCampaign}
              style={{
                padding: '8px 20px', border: 'none', borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <PaperAirplaneIcon style={{ width: '14px', height: '14px' }} />
              Create Campaign ({selectedLeadIds.size} companies, {totalContacts} contacts)
            </button>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
