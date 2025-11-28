import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react';
import { useModal } from '../contexts/ModalContext';
import './Contact.css';

const Contact = () => {
  const modal = useModal();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    await modal.alert('Thank you for your message! We\'ll get back to you soon.', 'Message Sent');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="contact-container">
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="contact-hero-content">
          <h1 className="contact-hero-title">
            Get in Touch
          </h1>
          <p className="contact-hero-subtitle">
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-main">
        <div className="contact-content">
          <div className="contact-grid">
            {/* Contact Information */}
            <div className="contact-info">
              <h2 className="contact-info-title">
                Let's Connect
              </h2>

              <div className="contact-info-list">
                <div className="contact-info-item">
                  <div className="contact-info-icon email">
                    <Mail />
                  </div>
                  <div className="contact-info-details">
                    <h3>Email</h3>
                    <p>hello@peakium.com</p>
                    <p>support@peakium.com</p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon phone">
                    <Phone />
                  </div>
                  <div className="contact-info-details">
                    <h3>Phone</h3>
                    <p>+1 (555) 123-4567</p>
                    <p>Mon-Fri 9AM-6PM EST</p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon location">
                    <MapPin />
                  </div>
                  <div className="contact-info-details">
                    <h3>Office</h3>
                    <p>123 Innovation Street</p>
                    <p>Tech City, TC 12345</p>
                  </div>
                </div>
              </div>

              <div className="contact-why-card">
                <h3 className="contact-why-title">
                  Why Reach Out?
                </h3>
                <ul className="contact-why-list">
                  <li className="contact-why-item">
                    <MessageCircle />
                    <span>Have a question about our content?</span>
                  </li>
                  <li className="contact-why-item">
                    <MessageCircle />
                    <span>Want to collaborate or contribute?</span>
                  </li>
                  <li className="contact-why-item">
                    <MessageCircle />
                    <span>Need technical support?</span>
                  </li>
                  <li className="contact-why-item">
                    <MessageCircle />
                    <span>Just want to say hello!</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-container">
              <h2 className="contact-form-title">
                Send us a Message
              </h2>

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="contact-form-row">
                  <div className="contact-form-group">
                    <label htmlFor="name" className="contact-form-label">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="contact-form-input"
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="contact-form-group">
                    <label htmlFor="email" className="contact-form-label">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="contact-form-input"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div className="contact-form-group">
                  <label htmlFor="subject" className="contact-form-label">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="contact-form-input"
                    placeholder="What's this about?"
                  />
                </div>

                <div className="contact-form-group">
                  <label htmlFor="message" className="contact-form-label">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="contact-form-textarea"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  className="contact-form-submit"
                >
                  <Send />
                  <span>Send Message</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="contact-faq">
        <div className="contact-faq-content">
          <div className="contact-faq-header">
            <h2 className="contact-faq-title">
              Frequently Asked Questions
            </h2>
            <p className="contact-faq-subtitle">
              Quick answers to common questions
            </p>
          </div>

          <div className="contact-faq-list">
            <div className="contact-faq-item">
              <h3 className="contact-faq-question">
                How often do you publish new articles?
              </h3>
              <p className="contact-faq-answer">
                We publish new articles weekly, typically on Tuesdays and Fridays.
                You can subscribe to our newsletter to be notified of new content.
              </p>
            </div>

            <div className="contact-faq-item">
              <h3 className="contact-faq-question">
                Can I contribute to Peakium?
              </h3>
              <p className="contact-faq-answer">
                Absolutely! We welcome guest contributions from writers who share our
                values and can provide valuable insights to our readers. Contact us
                with your pitch.
              </p>
            </div>

            <div className="contact-faq-item">
              <h3 className="contact-faq-question">
                Do you offer consulting or speaking services?
              </h3>
              <p className="contact-faq-answer">
                Yes, our team members are available for consulting projects and speaking
                engagements. Reach out to discuss your specific needs and availability.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;

