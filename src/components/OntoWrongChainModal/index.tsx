import "./index.scss";
import Modal from "components/Modal";

import Onto1 from "../../assets/images/onto-1.png";
import Onto2 from "../../assets/images/onto-2.png";
import Onto3 from "../../assets/images/onto-3.png";

import AlgebraConfig from "algebra.config";
import { useWeb3React } from "@web3-react/core";

export function OntoWrongChainModal({ handleClose }: { handleClose: () => void }) {
    const { chainId } = useWeb3React();

    return (
        <Modal
            fitContent={true}
            isOpen={true}
            onDismiss={() => {
                handleClose();
            }}
        >
            <div style={{ overflowY: "auto", overflowX: "hidden" }}>
                <div className="mb-1" style={{ fontSize: "18px" }}>
                    {`Please select ${AlgebraConfig.CHAIN_PARAMS[chainId || 100].chainName} chain`}
                </div>
                <div className="f c">
                    <div className="mb-1">
                        <div className="mb-1">1. Open "Connect Status"</div>
                        <img className={"onto-help-modal__img"} src={Onto1} />
                    </div>
                    <div className="mb-1">
                        <div className="mb-1">2. Click on "Manually connect to current site"</div>
                        <img className={"onto-help-modal__img"} src={Onto2} />
                    </div>
                    <div className="mb-1">
                        <div className="mb-1">{`3. Select ${AlgebraConfig.CHAIN_PARAMS[chainId || 100].chainName} and click "Connect"`}</div>
                        <img className={"onto-help-modal__img"} src={Onto3} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
