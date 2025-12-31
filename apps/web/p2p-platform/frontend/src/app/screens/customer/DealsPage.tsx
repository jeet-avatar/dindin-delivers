import React, { useEffect, useState } from 'react';
import { Typography, Tag, Button, Spin, message } from 'antd';
import {
  FireOutlined,
  CopyOutlined,
  CheckOutlined,
  TagOutlined,
  ClockCircleOutlined,
  ShoppingCartOutlined,
  LeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';

const { Title, Text } = Typography;

// Interfaces matching iOS models
interface FeaturedDeal {
  id: number;
  title: string;
  description?: string;
  discount_text: string;
  restaurant_id?: number;
  restaurant_name?: string;
  valid_until?: string;
  min_order_amount?: number;
}

interface Promotion {
  id: number;
  name: string;
  description?: string;
  type: string;
  value: number;
  promotion_code: string;
  vendor_name: string;
  min_order_amount?: number;
  end_date?: string;
}

// Filter options matching iOS
type DealFilter = 'all' | 'percentage' | 'bogo' | 'freeDelivery' | 'dollarOff';

const filterOptions: { key: DealFilter; label: string }[] = [
  { key: 'all', label: 'All Deals' },
  { key: 'percentage', label: '% Off' },
  { key: 'bogo', label: 'BOGO' },
  { key: 'freeDelivery', label: 'Free Delivery' },
  { key: 'dollarOff', label: '$ Off' },
];

const DealsPage: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  const [loading, setLoading] = useState(true);
  const [featuredDeals, setFeaturedDeals] = useState<FeaturedDeal[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<DealFilter>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      // Fetch featured deals
      const featuredRes = await axios.get(`${API_URL}/api/promotions/featured`);
      setFeaturedDeals(featuredRes.data.deals || []);

      // Fetch active promotions
      const promoRes = await axios.get(`${API_URL}/api/promotions/active`);
      setPromotions(promoRes.data.promotions || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      setFeaturedDeals([]);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPromotions = promotions.filter(promo => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'percentage') return promo.type === 'percentage';
    if (selectedFilter === 'bogo') return promo.type === 'bogo';
    if (selectedFilter === 'freeDelivery') return promo.type === 'free_delivery';
    if (selectedFilter === 'dollarOff') return promo.type === 'flat_amount';
    return true;
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    message.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getGradientForType = (type: string): string => {
    switch (type) {
      case 'percentage': return 'linear-gradient(135deg, #a855f7, #ec4899)';
      case 'bogo': return 'linear-gradient(135deg, #f97316, #ef4444)';
      case 'free_delivery': return 'linear-gradient(135deg, #10B981, #14b8a6)';
      case 'flat_amount': return 'linear-gradient(135deg, #3b82f6, #6366f1)';
      default: return 'linear-gradient(135deg, #6b7280, #9ca3af)';
    }
  };

  const getBadgeText = (promo: Promotion): { main: string; sub: string } => {
    switch (promo.type) {
      case 'percentage': return { main: `${promo.value}%`, sub: 'OFF' };
      case 'flat_amount': return { main: `$${promo.value}`, sub: 'OFF' };
      case 'bogo': return { main: 'B1G1', sub: 'FREE' };
      case 'free_delivery': return { main: 'FREE', sub: 'DLVRY' };
      default: return { main: 'DEAL', sub: '' };
    }
  };

  const getBadgeColor = (type: string): string => {
    switch (type) {
      case 'percentage': return '#a855f7';
      case 'flat_amount': return '#3b82f6';
      case 'bogo': return '#f97316';
      case 'free_delivery': return '#10B981';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <Text type="secondary">Loading deals...</Text>
      </div>
    );
  }

  return (
    <div className="deals-page">
      {/* Header */}
      <div className="deals-header">
        <Button
          type="text"
          icon={<LeftOutlined />}
          onClick={() => navigate(-1)}
          className="back-btn"
        />
        <Title level={4} style={{ margin: 0 }}>Deals & Offers</Title>
        <div style={{ width: 32 }} />
      </div>

      {/* Featured Deals - Hot Deals */}
      {featuredDeals.length > 0 && (
        <div className="featured-section">
          <div className="section-title">
            <FireOutlined style={{ color: '#f97316', fontSize: 20 }} />
            <Title level={5} style={{ margin: 0 }}>Hot Deals</Title>
          </div>
          <div className="featured-scroll">
            {featuredDeals.map(deal => (
              <div
                key={deal.id}
                className="featured-card"
                style={{ background: getGradientForType(
                  deal.discount_text.includes('%') ? 'percentage' :
                  deal.discount_text.includes('FREE') ? 'free_delivery' :
                  deal.discount_text.includes('BOGO') ? 'bogo' : 'flat_amount'
                )}}
              >
                <Text className="deal-headline">{deal.discount_text}</Text>
                <Text className="deal-vendor">{deal.restaurant_name}</Text>
                {deal.description && (
                  <Text className="deal-desc">{deal.description}</Text>
                )}
                <div className="deal-footer">
                  <Button
                    size="small"
                    className="copy-btn"
                    onClick={() => copyToClipboard(deal.discount_text.replace(/\s+/g, ''))}
                  >
                    {deal.discount_text.replace(/\s+/g, '')}
                    <CopyOutlined style={{ marginLeft: 4 }} />
                  </Button>
                  {deal.min_order_amount && (
                    <Text className="min-order">Min ${deal.min_order_amount}</Text>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Chips */}
      <div className="filter-section">
        {filterOptions.map(filter => (
          <Button
            key={filter.key}
            type={selectedFilter === filter.key ? 'primary' : 'default'}
            className={`filter-chip ${selectedFilter === filter.key ? 'active' : ''}`}
            onClick={() => setSelectedFilter(filter.key)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Available Offers */}
      <div className="offers-section">
        <div className="offers-header">
          <Text strong>Available Offers</Text>
          <Text type="secondary">{filteredPromotions.length} deals</Text>
        </div>

        {filteredPromotions.length === 0 ? (
          <div className="empty-state">
            <TagOutlined style={{ fontSize: 50, color: '#d1d5db' }} />
            <Text strong>No deals available</Text>
            <Text type="secondary">Check back later for new offers</Text>
          </div>
        ) : (
          <div className="promotions-list">
            {filteredPromotions.map(promo => {
              const badge = getBadgeText(promo);
              return (
                <div key={promo.id} className="promo-card">
                  <div
                    className="promo-badge"
                    style={{ background: getBadgeColor(promo.type) }}
                  >
                    <Text className="badge-main">{badge.main}</Text>
                    <Text className="badge-sub">{badge.sub}</Text>
                  </div>
                  <div className="promo-info">
                    <Text strong>{promo.name}</Text>
                    <Text type="secondary" className="promo-vendor">{promo.vendor_name}</Text>
                    {promo.description && (
                      <Text type="secondary" className="promo-desc">{promo.description}</Text>
                    )}
                    <div className="promo-meta">
                      {promo.min_order_amount && (
                        <span className="meta-item">
                          <ShoppingCartOutlined /> Min ${promo.min_order_amount}
                        </span>
                      )}
                      {promo.end_date && (
                        <span className="meta-item">
                          <ClockCircleOutlined /> Ends {promo.end_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="text"
                    className="copy-code-btn"
                    onClick={() => copyToClipboard(promo.promotion_code)}
                  >
                    {copiedCode === promo.promotion_code ? (
                      <>
                        <CheckOutlined style={{ color: '#22c55e' }} />
                        <span style={{ color: '#22c55e' }}>Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyOutlined style={{ color: '#10B981' }} />
                        <span style={{ color: '#10B981' }}>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .deals-page {
          max-width: 800px;
          margin: 0 auto;
          min-height: 100vh;
          background: #f7f7f8;
          padding-bottom: 100px;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
        }

        .deals-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: white;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .back-btn {
          font-size: 16px;
        }

        /* Featured Section - Hot Deals */
        .featured-section {
          padding: 16px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .featured-scroll {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 8px;
          -webkit-overflow-scrolling: touch;
        }

        .featured-card {
          min-width: 200px;
          height: 180px;
          padding: 16px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .deal-headline {
          font-size: 24px;
          font-weight: 900;
          color: white !important;
        }

        .deal-vendor {
          font-size: 14px;
          color: rgba(255,255,255,0.9) !important;
          margin-bottom: 4px;
        }

        .deal-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.8) !important;
          flex: 1;
        }

        .deal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }

        .copy-btn {
          background: white;
          border: none;
          font-weight: 600;
          font-size: 12px;
        }

        .min-order {
          font-size: 11px;
          color: rgba(255,255,255,0.7) !important;
        }

        /* Filter Section */
        .filter-section {
          display: flex;
          gap: 8px;
          padding: 0 16px 16px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .filter-chip {
          border-radius: 20px;
          white-space: nowrap;
        }

        .filter-chip.active {
          background: #10B981 !important;
          border-color: #10B981 !important;
        }

        /* Offers Section */
        .offers-section {
          padding: 0 16px;
        }

        .offers-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          gap: 8px;
        }

        .promotions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .promo-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }

        .promo-badge {
          width: 70px;
          height: 70px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .badge-main {
          font-size: 18px;
          font-weight: 900;
          color: white !important;
        }

        .badge-sub {
          font-size: 10px;
          font-weight: 500;
          color: rgba(255,255,255,0.9) !important;
        }

        .promo-info {
          flex: 1;
          min-width: 0;
        }

        .promo-vendor {
          display: block;
          font-size: 12px;
        }

        .promo-desc {
          display: block;
          font-size: 12px;
          margin-top: 4px;
        }

        .promo-meta {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          font-size: 11px;
          color: #6b7280;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .copy-code-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          font-size: 12px;
        }

        @media (max-width: 480px) {
          .featured-card {
            min-width: 180px;
            height: 160px;
          }

          .promo-badge {
            width: 60px;
            height: 60px;
          }

          .badge-main {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default DealsPage;
