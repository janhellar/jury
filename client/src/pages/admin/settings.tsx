import { useEffect, useState } from 'react';
import { createHeaders, getRequest, postRequest } from '../../api';
import Button from '../../components/Button';
import JuryHeader from '../../components/JuryHeader';
import { errorAlert } from '../../util';
import Popup from '../../components/Popup';
import Loading from '../../components/Loading';

// Text components
const Section = ({ children: c }: { children: React.ReactNode }) => (
    <h2 className="text-4xl mt-8 mb-2 text-primary">{c}</h2>
);
const SubSection = ({ children: c }: { children: React.ReactNode }) => (
    <h3 className="text-xl font-bold">{c}</h3>
);
const Description = ({ children: c }: { children: React.ReactNode }) => (
    <p className="text-light">{c}</p>
);

const AdminSettings = () => {
    const [reassignPopup, setReassignPopup] = useState(false);
    const [clockResetPopup, setClockResetPopup] = useState(false);
    const [dropPopup, setDropPopup] = useState(false);
    const [judgingTimer, setJudgingTimer] = useState('');
    const [categories, setCategories] = useState('');
    const [loading, setLoading] = useState(true);

    async function getOptions() {
        const res = await getRequest<Options>('/admin/options', 'admin');
        if (res.status !== 200) {
            errorAlert(res);
            return;
        }

        // Calculate judging timer MM:SS
        const timer = res.data?.judging_timer;
        if (timer) {
            const minutes = Math.floor(timer / 60);
            const seconds = timer % 60;
            const timerStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            setJudgingTimer(timerStr);
        }

        // Set categories
        const cats = res.data?.categories.join(', ');
        setCategories(cats ?? '');

        setLoading(false);
    }

    // Get the previous options
    useEffect(() => {
        getOptions();
    }, []);

    const reassignTables = async () => {
        const res = await postRequest<OkResponse>('/project/reassign', 'admin', null);
        if (res.status !== 200 || res.data?.ok !== 1) {
            errorAlert(res);
            return;
        }
        alert('Table numbers reassigned!');
        setReassignPopup(false);
    };

    const updateTimer = async () => {
        // Convert judging timer to time
        const [minutes, seconds] = judgingTimer.split(':');
        const timer = parseInt(minutes) * 60 + parseInt(seconds);
        if (isNaN(timer)) {
            alert('Invalid timer format!');
            return;
        }
        if (timer <= 0) {
            alert('Timer must be greater than 0!');
            return;
        }

        const res = await postRequest<OkResponse>('/admin/timer', 'admin', {
            judging_timer: timer,
        });
        if (res.status !== 200 || res.data?.ok !== 1) {
            errorAlert(res);
            return;
        }

        alert('Timer updated!');
        getOptions();
    };

    const updateCategories = async () => {
        // Split categories by comma and remove empty strings
        const filteredCats = categories
            .split(',')
            .map((cat) => cat.trim())
            .filter((cat) => cat !== '');

        // Post the new categories
        const res = await postRequest<OkResponse>('/admin/categories', 'admin', {
            categories: filteredCats,
        });
        if (res.status !== 200 || res.data?.ok !== 1) {
            errorAlert(res);
            return;
        }

        alert('Categories updated!');
        getOptions();
    };

    const resetClock = async () => {
        const res = await postRequest<OkResponse>('/admin/clock/reset', 'admin', null);
        if (res.status !== 200 || res.data?.ok !== 1) {
            errorAlert(res);
            return;
        }

        alert('Clock reset!');
        setClockResetPopup(false);
    };

    const dropDatabase = async () => {
        const res = await postRequest<OkResponse>('/admin/reset', 'admin', null);
        if (res.status !== 200 || res.data?.ok !== 1) {
            errorAlert(res);
            return;
        }

        alert('Database reset!');
        setDropPopup(false);
    };

    // TODO: Can we have this as not "any" datatype?
    const exportCsv = async (type: string) => {
        const res = await getRequest<any>(`/admin/export/${type}`, 'admin');
        if (res.status !== 200) {
            errorAlert(res);
            return;
        }

        saveToFile((await res.data?.blob()) as Blob, type, 'csv');
    };

    const exportByChallenge = async () => {
        const res = await fetch(`${import.meta.env.VITE_JURY_URL}/admin/export/challenges`, {
            method: 'GET',
            headers: createHeaders('admin', false),
        });

        if (res.status !== 200) {
            alert('Error exporting data: ' + res.statusText);
            return;
        }

        saveToFile((await res.blob()) as Blob, 'challenge-projects', 'zip');
    };

    const saveToFile = (blob: Blob, name: string, ext: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', `${name}.${ext}`);
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    return (
        <>
            <JuryHeader withBack withLogout isAdmin />
            <div className="flex flex-col items-start justify-center w-full px-8 py-4 md:px-16 md:py-8">
                <h1 className="text-4xl font-bold">Settings</h1>
                <Section>Judging Settings</Section>

                <SubSection>Reset Main Clock</SubSection>
                <Description>Reset the clock back to 00:00:00</Description>
                <Button
                    type="primary"
                    onClick={() => {
                        setClockResetPopup(true);
                    }}
                    className="mt-4 w-auto md:w-auto px-4 py-2 mb-8"
                >
                    Reset
                </Button>

                <SubSection>Set Judging Timer</SubSection>
                <Description>
                    Set how long judges have to view each project. This will reflect on the timer
                    that shows on the judging page.
                </Description>
                <input
                    className="w-full h-14 px-4 text-2xl border-lightest border-2 rounded-sm focus:border-primary focus:border-4 focus:outline-none"
                    type="string"
                    placeholder="MM:SS"
                    value={judgingTimer}
                    onChange={(e) => {
                        setJudgingTimer(e.target.value);
                    }}
                />
                <Button
                    type="primary"
                    onClick={updateTimer}
                    className="mt-4 w-auto md:w-auto px-4 py-2 mb-8"
                >
                    Update Timer
                </Button>

                <SubSection>Set Categories</SubSection>
                <Description>
                    Set the categories that the judges will be scoring each project on. Please
                    separate each category with a comma.
                </Description>
                <input
                    className="w-full h-14 px-4 text-xl border-lightest border-2 rounded-sm focus:border-primary focus:border-4 focus:outline-none"
                    type="string"
                    placeholder="Cat 1, Cat 2, Cat 3, ..."
                    value={categories}
                    onChange={(e) => {
                        setCategories(e.target.value);
                    }}
                />
                <Button
                    type="primary"
                    onClick={updateCategories}
                    className="mt-4 w-auto md:w-auto px-4 py-2"
                >
                    Update Categories
                </Button>

                <Section>Project Numbers</Section>

                <SubSection>Reassign Project Numbers</SubSection>
                <Description>
                    Reassign all project numbers to the projects. This will keep the relative order
                    but reassign the project numbers starting from the first project.
                </Description>
                <Button
                    type="primary"
                    onClick={() => {
                        setReassignPopup(true);
                    }}
                    className="mt-4 mb-8 w-auto md:w-auto px-4 py-2 bg-gold text-black"
                >
                    Reassign
                </Button>

                <Section>Export Data</Section>

                <SubSection>Export Collection</SubSection>
                <Description>Export each collection individually as a CSV download.</Description>
                <div className="flex">
                    <Button
                        type="primary"
                        onClick={() => {
                            exportCsv('judges');
                        }}
                        className="mt-4 w-auto md:w-auto px-4 py-2 mr-4"
                    >
                        Export Judges
                    </Button>
                    <Button
                        type="primary"
                        onClick={() => {
                            exportCsv('projects');
                        }}
                        className="mt-4 w-auto md:w-auto px-4 py-2 mr-4"
                    >
                        Export Projects
                    </Button>
                    <Button
                        type="primary"
                        onClick={exportByChallenge}
                        className="mt-4 w-auto md:w-auto px-4 py-2"
                    >
                        Export by Challenges
                    </Button>
                </div>

                <Section>Reset Database</Section>

                <SubSection>THIS WILL DELETE THE ENTIRE DATABASE</SubSection>
                <Description>
                    Mostly used for testing purposes/before the event if you want to reset
                    everything bc something got messed up. Do NOT use this during judging (duh).
                </Description>
                <Button
                    type="error"
                    onClick={() => {
                        setDropPopup(true);
                    }}
                    className="mt-4 w-auto md:w-auto px-4 py-2"
                >
                    Drop Database
                </Button>
            </div>
            <Popup
                enabled={reassignPopup}
                setEnabled={setReassignPopup}
                onSubmit={reassignTables}
                submitText="Reassign"
                title="Heads Up!"
                red
            >
                Are you sure you want to reassign project numbers? This should NOT be done DURING
                judging; only beforehand!!
            </Popup>
            <Popup
                enabled={clockResetPopup}
                setEnabled={setClockResetPopup}
                onSubmit={resetClock}
                submitText="Reset"
                title="Heads Up!"
                red
            >
                Are you sure you want to reset the main clock? This will reset the clock to 00:00:00
            </Popup>
            <Popup
                enabled={dropPopup}
                setEnabled={setDropPopup}
                onSubmit={dropDatabase}
                submitText="RESET DATA"
                title="Heads Up!"
                red
            >
                THIS WILL ACTUALLY DELETE ALL DATA!!!!! YOU NEED TO BE ABSOLUTELY SURE YOU WANT TO
                DO THIS. THIS IS YOUR LAST WARNING!
            </Popup>
            <Loading disabled={!loading} />
        </>
    );
};

export default AdminSettings;
