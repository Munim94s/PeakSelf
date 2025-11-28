import React from 'react';
import { Users, Target, Lightbulb, Heart } from 'lucide-react';
import './About.css';

const About = () => {
  return (
    <div className="about-container">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-content">
          <h1 className="about-hero-title">
            About Peakium
          </h1>
          <p className="about-hero-subtitle">
            We're passionate about sharing knowledge, insights, and experiences
            that help individuals and communities reach their peak potential.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="about-mission">
        <div className="about-mission-content">
          <div className="about-section-header">
            <h2 className="about-section-title">
              Our Mission
            </h2>
            <p className="about-section-subtitle">
              To create a platform where knowledge meets inspiration, and where
              every reader can discover tools, insights, and stories that propel
              them toward their personal and professional goals.
            </p>
          </div>

          <div className="about-mission-grid">
            <div className="about-mission-item">
              <div className="about-mission-icon inspire">
                <Lightbulb />
              </div>
              <h3 className="about-mission-item-title">Inspire</h3>
              <p className="about-mission-item-text">
                Share stories and insights that spark new ideas and motivate positive change.
              </p>
            </div>

            <div className="about-mission-item">
              <div className="about-mission-icon educate">
                <Target />
              </div>
              <h3 className="about-mission-item-title">Educate</h3>
              <p className="about-mission-item-text">
                Provide practical knowledge and actionable advice across diverse topics.
              </p>
            </div>

            <div className="about-mission-item">
              <div className="about-mission-icon connect">
                <Heart />
              </div>
              <h3 className="about-mission-item-title">Connect</h3>
              <p className="about-mission-item-text">
                Build a community of learners, creators, and growth-minded individuals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="about-story">
        <div className="about-story-content">
          <div className="about-story-grid">
            <div>
              <h2 className="about-section-title">
                Our Story
              </h2>
              <div className="about-story-text">
                <p>
                  Peakium was born from a simple belief: everyone has the potential
                  to achieve extraordinary things when they have access to the right
                  knowledge, tools, and inspiration.
                </p>
                <p>
                  What started as a personal blog sharing insights about technology
                  and personal development has evolved into a comprehensive platform
                  that serves thousands of readers worldwide.
                </p>
                <p>
                  Today, we're proud to feature content from expert writers, industry
                  leaders, and passionate individuals who share our commitment to
                  continuous learning and growth.
                </p>
              </div>
            </div>

            <div className="about-stats-card">
              <div className="about-stats-grid">
                <div>
                  <div className="about-stat-number blue">50+</div>
                  <div className="about-stat-label">Articles Published</div>
                </div>
                <div>
                  <div className="about-stat-number green">10K+</div>
                  <div className="about-stat-label">Monthly Readers</div>
                </div>
                <div>
                  <div className="about-stat-number purple">25+</div>
                  <div className="about-stat-label">Expert Contributors</div>
                </div>
                <div>
                  <div className="about-stat-number orange">4</div>
                  <div className="about-stat-label">Content Categories</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="about-values">
        <div className="about-values-content">
          <div className="about-section-header">
            <h2 className="about-section-title">
              Our Values
            </h2>
            <p className="about-section-subtitle">
              The principles that guide everything we do
            </p>
          </div>

          <div className="about-values-grid">
            <div className="about-value-item quality">
              <h3 className="about-value-title">Quality First</h3>
              <p className="about-value-text">
                We believe in delivering high-quality, well-researched content that
                provides real value to our readers.
              </p>
            </div>

            <div className="about-value-item authenticity">
              <h3 className="about-value-title">Authenticity</h3>
              <p className="about-value-text">
                Our content comes from real experiences, genuine insights, and
                authentic voices from our community.
              </p>
            </div>

            <div className="about-value-item inclusivity">
              <h3 className="about-value-title">Inclusivity</h3>
              <p className="about-value-text">
                We welcome diverse perspectives and strive to create content that
                resonates with people from all walks of life.
              </p>
            </div>

            <div className="about-value-item growth">
              <h3 className="about-value-title">Growth Mindset</h3>
              <p className="about-value-text">
                We're committed to continuous improvement, both in our content
                and in supporting our readers' growth journeys.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="about-team">
        <div className="about-team-content">
          <div className="about-section-header">
            <h2 className="about-section-title">
              Meet Our Team
            </h2>
            <p className="about-section-subtitle">
              The passionate individuals behind Peakium
            </p>
          </div>

          <div className="about-team-grid">
            <div className="about-team-member">
              <div className="about-team-avatar sarah">
                <span>SJ</span>
              </div>
              <h3 className="about-team-name">Sarah Johnson</h3>
              <p className="about-team-role editor">Editor-in-Chief</p>
              <p className="about-team-bio">
                Technology enthusiast with 8+ years in web development and content strategy.
              </p>
            </div>

            <div className="about-team-member">
              <div className="about-team-avatar michael">
                <span>MC</span>
              </div>
              <h3 className="about-team-name">Michael Chen</h3>
              <p className="about-team-role content">Content Director</p>
              <p className="about-team-bio">
                Personal development expert and certified life coach with a passion for growth.
              </p>
            </div>

            <div className="about-team-member">
              <div className="about-team-avatar alex">
                <span>AR</span>
              </div>
              <h3 className="about-team-name">Alex Rodriguez</h3>
              <p className="about-team-role tech">Tech Lead</p>
              <p className="about-team-bio">
                Full-stack developer and open-source contributor passionate about modern web technologies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="about-cta-content">
          <h2 className="about-cta-title">
            Join Our Community
          </h2>
          <p className="about-cta-subtitle">
            Be part of a growing community of learners, creators, and growth-minded individuals.
          </p>
          <div className="about-cta-buttons">
            <a
              href="#"
              className="about-cta-btn-primary"
            >
              Subscribe to Newsletter
            </a>
            <a
              href="#"
              className="about-cta-btn-secondary"
            >
              Follow on Social
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;