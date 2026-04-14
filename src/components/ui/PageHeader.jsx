import AppButton from './AppButton';
import './ui.css';

function PageHeader({ title, onBack, backLabel = 'Volver', actions }) {
    return (
        <div className="page-header">
            <div className="page-header__left">
                {onBack && (
                    <AppButton variant="secondary" onClick={onBack}>
                        {backLabel}
                    </AppButton>
                )}
                <h2 className="page-header__title">{title}</h2>
            </div>
            <div className="page-header__actions">{actions}</div>
        </div>
    );
}

export default PageHeader;
