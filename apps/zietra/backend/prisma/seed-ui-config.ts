import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUIConfig() {
  console.log('🌱 Seeding UI configuration...');

  // Seed default navigation items
  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'HomeIcon',
      order: 0,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'USER'],
    },
    {
      label: 'Contacts',
      path: '/contacts',
      icon: 'UsersIcon',
      order: 1,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'USER'],
    },
    {
      label: 'Companies',
      path: '/companies',
      icon: 'BuildingOfficeIcon',
      order: 2,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'USER'],
    },
    {
      label: 'Deals',
      path: '/deals',
      icon: 'CurrencyDollarIcon',
      order: 3,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'USER'],
    },
    {
      label: 'Campaigns',
      path: '/campaigns',
      icon: 'MegaphoneIcon',
      order: 4,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP'],
    },
    {
      label: 'Video Campaigns',
      path: '/video-campaigns',
      icon: 'VideoCameraIcon',
      order: 5,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP'],
    },
    {
      label: 'Lead Discovery',
      path: '/leads',
      icon: 'MagnifyingGlassIcon',
      order: 6,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP'],
    },
    {
      label: 'Activities',
      path: '/activities',
      icon: 'CalendarIcon',
      order: 7,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'USER'],
    },
    {
      label: 'Email',
      path: '/email',
      icon: 'EnvelopeIcon',
      order: 8,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP'],
    },
    {
      label: 'Automations',
      path: '/automations',
      icon: 'BoltIcon',
      order: 9,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: 'ChartBarIcon',
      order: 10,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: 'Cog6ToothIcon',
      order: 11,
      roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'USER'],
    },
    {
      label: 'Super Admin',
      path: '/super-admin',
      icon: 'ShieldCheckIcon',
      order: 12,
      roles: ['SUPER_ADMIN'],
      badge: 'Admin',
      badgeColor: 'red',
    },
  ];

  console.log('📝 Creating navigation items...');
  for (const item of navigationItems) {
    await prisma.navigationItem.upsert({
      where: {
        // Use a composite unique identifier
        id: `nav-${item.path}`,
      },
      create: {
        id: `nav-${item.path}`,
        ...item,
      },
      update: item,
    });
    console.log(`  ✅ ${item.label}`);
  }

  // Seed default theme
  console.log('\n🎨 Creating default theme...');
  const existingTheme = await prisma.themeConfig.findFirst({
    where: { isActive: true },
  });

  // Only create Default theme if NO active theme exists
  if (!existingTheme) {
    await prisma.themeConfig.upsert({
      where: { name: 'Default' },
      create: {
        name: 'Default',
        primaryColor: '#3B82F6', // Blue
        secondaryColor: '#8B5CF6', // Purple
        accentColor: '#10B981', // Green
        backgroundColor: '#FFFFFF',
        textColor: '#111827',
        sidebarColor: '#1F2937',
        headerColor: '#FFFFFF',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
        borderRadius: '0.5rem',
        isActive: true,
        isDefault: true,
        buttonStyles: {
          primary: {
            bg: '#3B82F6',
            hover: '#2563EB',
            text: '#FFFFFF',
          },
          secondary: {
            bg: '#8B5CF6',
            hover: '#7C3AED',
            text: '#FFFFFF',
          },
          danger: {
            bg: '#EF4444',
            hover: '#DC2626',
            text: '#FFFFFF',
          },
        },
      },
      update: {},
    });
    console.log('  ✅ Default theme created');
  } else {
    console.log(`  ℹ️  Active theme "${existingTheme.name}" already exists, skipping Default theme creation`);
  }

  // Seed dark theme
  console.log('\n🌙 Creating dark theme...');
  await prisma.themeConfig.upsert({
    where: { name: 'Dark' },
    create: {
      name: 'Dark',
      primaryColor: '#60A5FA', // Light Blue
      secondaryColor: '#A78BFA', // Light Purple
      accentColor: '#34D399', // Light Green
      backgroundColor: '#111827',
      textColor: '#F9FAFB',
      sidebarColor: '#1F2937',
      headerColor: '#1F2937',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      borderRadius: '0.5rem',
      isActive: false,
      isDefault: false,
      buttonStyles: {
        primary: {
          bg: '#60A5FA',
          hover: '#3B82F6',
          text: '#111827',
        },
        secondary: {
          bg: '#A78BFA',
          hover: '#8B5CF6',
          text: '#111827',
        },
        danger: {
          bg: '#F87171',
          hover: '#EF4444',
          text: '#111827',
        },
      },
    },
    update: {},
  });
  console.log('  ✅ Dark theme created');

  // Seed branding
  console.log('\n🏢 Creating default branding...');
  const existingBranding = await prisma.brandingConfig.findFirst({
    where: { isActive: true },
  });

  if (!existingBranding) {
    await prisma.brandingConfig.create({
      data: {
        companyName: 'BrandMonkz CRM',
        footerText: '© 2025 BrandMonkz. All rights reserved.',
        supportEmail: 'support@brandmonkz.com',
        isActive: true,
        socialLinks: {
          twitter: 'https://twitter.com/brandmonkz',
          linkedin: 'https://linkedin.com/company/brandmonkz',
        },
      },
    });
    console.log('  ✅ Default branding created');
  } else {
    console.log('  ℹ️  Branding already exists, skipping');
  }

  console.log('\n✨ UI configuration seeding completed!\n');
}

seedUIConfig()
  .catch((e) => {
    console.error('❌ Error seeding UI config:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
