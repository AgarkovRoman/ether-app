import React, {useEffect, useState} from "react";
import {ethers} from "ethers";

import {contractABI, contractAddress} from "../constants/constants";

// @ts-ignore
const {ethereum} = window;

const getEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    return new ethers.Contract(contractAddress, contractABI, signer);
}

const isEthereumNotExist = () => {
    if (!ethereum) return alert('Please install metamask');
}

type FormDataType = {
    addressTo: string;
    amount: string;
    keyword: string;
    message: string;
}

export type HandleChangeType = {
    e: React.ChangeEvent<HTMLInputElement>;
    name: string
}

export enum TransactionStatusEnum {
    success = 'success',
    error = 'error',
    pending = 'pending',
}

type TransactionStatusType = keyof typeof TransactionStatusEnum;

type transactionsContextType = {
    currentAccount: string;
    connectWallet: () => void;
    handleChange: (value: HandleChangeType) => void;
    formData: FormDataType,
    setFormData: React.Dispatch<React.SetStateAction<FormDataType>>,
    sendTransaction: () => Promise<void>;
    transactionStatus: keyof typeof TransactionStatusEnum;
    transactions: any[];
}

export const TransactionsContext = React.createContext<transactionsContextType>({
    currentAccount: '',
    connectWallet: () => {},
    handleChange: () => {},
    formData: {
        addressTo: '',
        amount: '',
        keyword: '',
        message: '',
    },
    setFormData: () => {},
    sendTransaction: async () => {},
    transactionStatus: TransactionStatusEnum.success,
    transactions: [],
});

type TransactionProviderProps = {
    children: React.ReactElement;
}

export const TransactionProvider = ({children}: TransactionProviderProps) => {
    const [currentAccount, setCurrentAccount] = useState<string>('');
    const [transactionStatus, setTransactionStatus] = useState<TransactionStatusType>('success');
    const [formData, setFormData] = useState<FormDataType>({addressTo: '', amount: '', keyword: '', message: ''});
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem('transactionCount'));
    const [transactions, setTransaction] = useState<any[]>([]);

    const handleChange = ({e, name}: HandleChangeType) => {
        setFormData((prevState) => ({...prevState, [name]: e.target.value}))
    }

    const getAllTransactions = async () => {
        try {
            isEthereumNotExist();
            const transactionContract = getEthereumContract();
            const availableTransactions = await transactionContract.getAllTransactions();
            const structuredTransactions = await availableTransactions.map((transaction: { receiver: any; sender: any; timestamp: { toNumber: () => number; }; keyword: any; amount: { _hex: string; }; }) => ({
                addressTo: transaction.receiver,
                addressFrom: transaction.sender,
                timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
                keyword: transaction.keyword,
                amount: parseInt(transaction.amount._hex) / (10 ** 18),
            }))
            setTransaction(structuredTransactions);
        } catch (error) {
            console.log(error);
        }
    }

    const checkWallet = async () => {
        try {
            isEthereumNotExist()
            const accounts = await ethereum.request({method: 'eth_accounts'})
            if (accounts.length) {
                setCurrentAccount(accounts[0]);
                await getAllTransactions();
            } else {
                console.log('No accounts found');
            }
        } catch (error) {
            console.log(error)
            throw new Error('No Ethereum object');
        }

    }

    const checkIfTransactionsExist = async () => {
        try {
            const transactionContract = getEthereumContract();
            const transactionCount = await transactionContract.getTransactionsCount();
            window.localStorage.setItem('transactionCount', transactionCount);
        } catch (error) {
            console.log(error)
            throw new Error('No Ethereum object');
        }

    }

    const connectWallet = async () => {
        try {
            isEthereumNotExist();
            const accounts = await ethereum.request({method: 'eth_requestAccounts'})
            setCurrentAccount(accounts[0]);
        } catch (error) {
            console.log(error)
            throw new Error('No Ethereum object');
        }
    }

    const sendTransaction = async () => {
        try {
            isEthereumNotExist();
            const {addressTo, amount, keyword, message} = formData;
            const transactionContract = getEthereumContract();
            const parseAmount = ethers.utils.parseEther(amount);

            await ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: currentAccount,
                    to: addressTo,
                    gas: '0x9001',
                    value: parseAmount._hex,
                }]
            });

            const transactionHash = await transactionContract.addToBlockchain(addressTo, parseAmount, message, keyword);

            setTransactionStatus(TransactionStatusEnum.pending);
            console.log(`Loading - ${transactionHash.hash}`);

            await transactionHash.wait();

            setTransactionStatus(TransactionStatusEnum.success);
            console.log(`Success - ${transactionHash.hash}`);

            const transactionCount = await transactionContract.getTransactionsCount();
            setTransactionCount(transactionCount.toNumber());

        } catch (error) {
            console.log(error)
            throw new Error('No Ethereum object');
        }
    }

    useEffect(() => {
        checkWallet();
        checkIfTransactionsExist();
    }, [])

    return (
        <TransactionsContext.Provider value={{
            connectWallet,
            currentAccount,
            handleChange,
            formData,
            setFormData,
            sendTransaction,
            transactionStatus,
            transactions,
        }}>
            {children}
        </TransactionsContext.Provider>
    )
}
