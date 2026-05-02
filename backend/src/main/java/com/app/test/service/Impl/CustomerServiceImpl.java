package com.app.test.service.Impl;

import com.app.test.beans.dto.request.CustomerRequest;
import com.app.test.beans.dto.response.CustomerResponse;
import com.app.test.beans.dto.response.PageResponse;
import com.app.test.beans.dto.response.base.ResponseModelDto;
import com.app.test.model.MsCustomer;
import com.app.test.repository.MsCustomerRepository;
import com.app.test.service.CustomerService;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Log4j2
@Service
public class CustomerServiceImpl implements CustomerService {

    @Autowired
    private MsCustomerRepository msCustomerRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public ResponseModelDto<PageResponse<CustomerResponse>> search(
            String keyword,
            int page,
            int size
    ) {

        try {

            Pageable pageable = PageRequest.of(page, size);

            Page<MsCustomer> resultPage;

            if (keyword == null || keyword.trim().isEmpty()) {
                resultPage = msCustomerRepository.findByRecordStatus('A', pageable);
            } else {
                resultPage = msCustomerRepository
                        .findByCustomerNameContainingIgnoreCaseAndRecordStatus(
                                keyword, 'A', pageable
                        );
            }

            List<CustomerResponse> content = resultPage.getContent()
                    .stream()
                    .map(entity -> {
                        CustomerResponse res = new CustomerResponse();
                        res.setCustomerId(entity.getCustomerId());
                        res.setCustomerCode(entity.getCustomerCode());
                        res.setCustomerName(entity.getCustomerName());
                        res.setAddress(entity.getAddress());
                        res.setTelNo(entity.getTelNo());
                        return res;
                    })
                    .collect(Collectors.toList());

            PageResponse<CustomerResponse> pageResponse = new PageResponse<>();
            pageResponse.setContent(content);
            pageResponse.setPage(resultPage.getNumber());
            pageResponse.setSize(resultPage.getSize());
            pageResponse.setTotalElements(resultPage.getTotalElements());
            pageResponse.setTotalPages(resultPage.getTotalPages());

            return new ResponseModelDto<>("Success", pageResponse, true);

        } catch (Exception e) {
            return new ResponseModelDto<>(
                    "Error",
                    e.getMessage(),
                    null,
                    false
            );
        }
    }

    @Override
    public ResponseModelDto<MsCustomer> create(CustomerRequest request) {

        try {

            if (msCustomerRepository.existsByCustomerName(request.getCustomerName())) {
                return new ResponseModelDto<>(
                        "Failed",
                        "Duplicate Customer Name",
                        null,
                        false
                );
            }

            MsCustomer entity = new MsCustomer();
            entity.setCustomerCode(request.getCustomerCode());
            entity.setCustomerName(request.getCustomerName());
            entity.setAddress(request.getAddress());
            entity.setTelNo(request.getTelNo());

            entity.setCreatedBy("Admin");
            entity.setCreatedDate(new Date());
            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(new Date());
            entity.setRecordStatus('A');

            entity = msCustomerRepository.save(entity);

            return new ResponseModelDto<>("Success", entity, true);

        } catch (Exception e) {
            return new ResponseModelDto<>(
                    "Error",
                    e.getMessage(),
                    null,
                    false
            );
        }
    }

    @Override
    public ResponseModelDto<CustomerResponse> update(CustomerRequest request) {

        try {

            MsCustomer entity = msCustomerRepository.findById(request.getCustomerId())
                    .orElse(null);

            if (entity == null || entity.getRecordStatus() != 'A') {
                return new ResponseModelDto<>(
                        "Failed",
                        "Customer not found",
                        null,
                        false
                );
            }

            entity.setCustomerName(request.getCustomerName());
            entity.setAddress(request.getAddress());
            entity.setTelNo(request.getTelNo());

            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(new Date());

            entity = msCustomerRepository.save(entity);

            CustomerResponse res = new CustomerResponse();
            res.setCustomerId(entity.getCustomerId());
            res.setCustomerCode(entity.getCustomerCode());
            res.setCustomerName(entity.getCustomerName());
            res.setAddress(entity.getAddress());
            res.setTelNo(entity.getTelNo());

            return new ResponseModelDto<>("Success", res, true);

        } catch (Exception e) {
            return new ResponseModelDto<>(
                    "Error",
                    e.getMessage(),
                    null,
                    false
            );
        }
    }

    @Override
    public ResponseModelDto<MsCustomer> delete(CustomerRequest request) {

        try {

            MsCustomer entity = msCustomerRepository.findById(request.getCustomerId())
                    .orElse(null);

            if (entity == null) {
                return new ResponseModelDto<>(
                        "Failed",
                        "Customer not found",
                        null,
                        false
                );
            }

            entity.setRecordStatus('D');
            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(new Date());

            msCustomerRepository.save(entity);

            return new ResponseModelDto<>("Success", entity, true);

        } catch (Exception e) {
            return new ResponseModelDto<>(
                    "Error",
                    e.getMessage(),
                    null,
                    false
            );
        }
    }
}
