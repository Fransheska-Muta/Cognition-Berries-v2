import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import { Link } from 'react-router-dom'
import './ComminityForum.css'

function CommunityForum() {
  return (
    <>
      <Navbar />
      <section className="sec1">
        <h1>
          Community Forum
        </h1>

        <p>
          Engage With our peers, share knowledge, and grow together. Join discussions <br />
          ask question, and enhance your financial literacy in a supportive <br />
          environment
        </p>

      </section>

    {/* ===========Section 2=============== */}

      <section className="Sec2">
        <p>
          connect
        </p>
        <h1>
          Engage with Our Vibrant
          <br />
          Community
        </h1>
        <p>
          Join discussions on various financial topics and share insights with fellow learners. Our community forum is designed to foster collaboration and support among users.
        </p>
        <div className="blocks">
          <div className="block">
            <img src="/SereneCountrysideLandscape(1).png" alt="" width='400' height='200' />
            <h3>
              Explorer our Forum Catrgories
            </h3>
            <p>
              Dive into engaging conversations tailored for all levels.
            </p>
          </div>
          <div className="block">
            <img src="/SereneCountrysideLandscape(1).png" alt="" width='400' height='200' />
            <h3>
              Stalk Talk : Share Your Insights
            </h3>
            <p>
              Discuss market trends, stock picks, and strategies.
            </p>
          </div>
          <div className="block">
            <img src="/SereneCountrysideLandscape(1).png" alt="" width='400' height='200' />
            <h3>
              Begginer Questions : Get Help Here
            </h3>
            <p>
              Ask questions and gain knowledge from experienced investors.
            </p>
          </div>
        </div>
        <Link>
          <button>
            Join {'>'}
          </button>
        </Link>
        <Link>
          <button>
            Post {'>'}
          </button>
        </Link>
      </section>

      <Footer />
    </>
  )
}

export default CommunityForum
