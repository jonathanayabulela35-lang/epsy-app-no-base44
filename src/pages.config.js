import AccountAccess from './pages/AccountAccess';
import AdminBuilder from './pages/AdminBuilder';
import AdminChallengeDays from './pages/AdminChallengeDays';
import AdminChallenges from './pages/AdminChallenges';
import AdminDecoder from './pages/AdminDecoder';
import AdminHome from './pages/AdminHome';
import AdminSchools from './pages/AdminSchools';
import AdminStudentAccess from './pages/AdminStudentAccess';
import ChallengeView from './pages/ChallengeView';
import Home from './pages/Home';
import InsightLibrary from './pages/InsightLibrary';
import Personalisation from './pages/Personalisation';
import QuestionBuilder from './pages/QuestionBuilder';
import QuestionDecoder from './pages/QuestionDecoder';
import SchoolDashboard from './pages/SchoolDashboard';
import Settings from './pages/Settings';
import SchoolStudentAccess from './pages/SchoolStudentAccess';
import __Layout from './Layout.jsx';

export const PAGES = {
    "AccountAccess": AccountAccess,
    "AdminHome": AdminHome,
    "AdminBuilder": AdminBuilder,
    "AdminChallengeDays": AdminChallengeDays,
    "AdminChallenges": AdminChallenges,
    "AdminDecoder": AdminDecoder,
    "AdminSchools": AdminSchools,
    "AdminStudentAccess": AdminStudentAccess,
    "ChallengeView": ChallengeView,
    "Home": Home,
    "InsightLibrary": InsightLibrary,
    "Personalisation": Personalisation,
    "QuestionBuilder": QuestionBuilder,
    "QuestionDecoder": QuestionDecoder,
    "SchoolDashboard": SchoolDashboard,
    "Settings": Settings,
    "SchoolStudentAccess": SchoolStudentAccess,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};