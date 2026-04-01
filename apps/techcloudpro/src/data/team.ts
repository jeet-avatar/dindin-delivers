export interface TeamMember {
  name: string
  title: string
  bio: string
  linkedin?: string
  email?: string
}

export const team: TeamMember[] = [
  {
    name: 'Jithesh Manoharan',
    title: 'Chief Executive Officer',
    bio: 'A multi-faceted, multi-certified IT consultant with experience spanning over two decades across startups and the Big 4 alike. Jithesh has worked as a NetSuite ERP Consultant, Principal Advisor, and Solution Architect for high-profile companies including Wells Fargo, Hampton Creek, Anastasia Beverly Hills, and JUST Inc. His expertise includes managing multiple concurrent projects across industry verticals, and he has established himself as a trusted advisor to C-level decision-makers on enterprise-wide technology management strategies.',
    linkedin: 'https://www.linkedin.com/in/jiteshmanoharan/',
    email: 'jm@techcloudpro.com',
  },
  {
    name: 'Rajesh Manoharan',
    title: 'Managing Director',
    bio: 'A born entrepreneur, Rajesh divides his time between multiple business interests ranging from solar-powered sustainable products to innovative corporate gifting, organic foods production, and technology & logistics. He brings a unique blend of business acumen and operational expertise to TechCloudPro, ensuring that our delivery operations run seamlessly across all geographies.',
    linkedin: 'https://www.linkedin.com/in/rajesh-nair-356b671a2/',
    email: 'rajesh@techcloudpro.com',
  },
  {
    name: 'Ethan Vereal',
    title: 'Chief Technology Officer',
    bio: 'With deep expertise in cloud architecture, AI/ML systems, and enterprise security, Ethan leads TechCloudPro\'s technology vision. He architects our private LLM deployment frameworks and oversees the technical delivery of complex ERP implementations. His background spans distributed systems, DevOps, and cybersecurity — ensuring every solution we deliver meets the highest standards of performance and security.',
  },
  {
    name: 'Tom Robinson',
    title: 'VP of Sales, North America',
    bio: 'Tom brings over 15 years of enterprise sales leadership to TechCloudPro, with a track record of building high-performing teams across the technology consulting space. He specializes in helping Fortune 500 and mid-market companies identify the right technology solutions for their digital transformation journeys, with particular expertise in the NetSuite and cybersecurity markets.',
  },
  {
    name: 'Ajay Dhar',
    title: 'Senior Mentor & Head of Project Delivery',
    bio: 'A seasoned technology leader with a passion for mentoring the next generation of consultants, Ajay ensures that every project TechCloudPro delivers exceeds client expectations. With decades of experience in ERP implementations, system integrations, and digital transformation programs, he brings a rigorous methodology to project governance while fostering a culture of continuous learning and excellence.',
  },
  {
    name: 'Tony Sullivan',
    title: 'Strategic Advisor',
    bio: 'Tony advises TechCloudPro on market strategy, partnerships, and growth initiatives. With an extensive network across the enterprise technology ecosystem and deep experience in scaling professional services firms, he provides strategic guidance on market positioning, partner development, and emerging technology opportunities.',
  },
]
